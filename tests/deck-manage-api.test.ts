import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("deck read, edit, delete and leeches", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_deck_manage");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { cardState, cards, decks, reviewLog } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const a = await f.createProfile(db, { name: "A" });
  const b = await f.createProfile(db, { name: "B" });
  const deck = await f.createDeck(db, a.id, { name: "Bio" });
  const theirs = await f.createDeck(db, b.id, { name: "Chem" });
  const c1 = await f.createCard(db, deck.id, { topic: "Cells" });
  const c2 = await f.createCard(db, deck.id, { topic: "Cells" });
  const c3 = await f.createCard(db, deck.id, { topic: "Genes" });
  await f.createCard(db, deck.id, { topic: "Genes" });
  await f.createCardState(db, a.id, c1.id, { box: 5, dueDate: "2000-01-01" });
  await f.createCardState(db, a.id, c2.id, { box: 1, dueDate: "2999-01-01", lapses: 9, status: "leech" });
  await f.createCardState(db, a.id, c3.id, { box: 2, dueDate: "2000-01-01", lapses: 8, status: "leech" });
  await f.createReviewLog(db, a.id, c1.id);
  await f.createReviewLog(db, a.id, c2.id);
  await f.createReviewLog(db, a.id, c2.id, { undoneAt: new Date() });

  const route = await import("@/app/api/v1/decks/[id]/route");
  const leechRoute = await import("@/app/api/v1/decks/[id]/leeches/route");
  const req = (p: string, init: RequestInit = {}) =>
    new Request("http://x/", { ...init, headers: { "x-profile-id": p, "content-type": "application/json" } });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const patch = (p: string, id: string, body: unknown) =>
    route.PATCH(req(p, { method: "PATCH", body: JSON.stringify(body) }), ctx(id));

  const got = (await (await route.GET(req(a.id), ctx(deck.id))).json()).deck;
  expect(got.cardCount).toBe(4);
  expect(got.reviewCount).toBe(2);
  expect(got.topics).toEqual([
    { topic: "Cells", cardCount: 2, dueCount: 1, mastery: { new: 0, notYet: 1, nearly: 0, gotIt: 1 }, masteredPercent: 50 },
    { topic: "Genes", cardCount: 2, dueCount: 1, mastery: { new: 1, notYet: 0, nearly: 1, gotIt: 0 }, masteredPercent: 0 },
  ]);

  const ok = await patch(a.id, deck.id, { name: " Biology ", groupName: "Science", color: "sage", answerStyle: "bullets" });
  expect(ok.status).toBe(200);
  expect((await ok.json()).deck).toMatchObject({ name: "Biology", groupName: "Science", color: "sage", answerStyle: "bullets" });
  for (const bad of [{ name: "" }, { color: "red" }, { answerStyle: "poem" }, { groupName: 3 }, {}, { owner: "x" }]) {
    expect((await patch(a.id, deck.id, bad)).status).toBe(400);
  }
  expect((await route.PATCH(req(a.id, { method: "PATCH", body: "{" }), ctx(deck.id))).status).toBe(400);

  const leeches = (await (await leechRoute.GET(req(a.id), ctx(deck.id))).json()).leeches;
  expect(leeches.map((l: { id: string; lapses: number }) => [l.id, l.lapses])).toEqual([[c2.id, 9], [c3.id, 8]]);

  // Other profile and unknown ids: 404 on every endpoint.
  for (const id of [theirs.id, "00000000-0000-4000-8000-000000000000"]) {
    expect((await route.GET(req(a.id), ctx(id))).status).toBe(404);
    expect((await patch(a.id, id, { name: "X" })).status).toBe(404);
    expect((await route.DELETE(req(a.id, { method: "DELETE" }), ctx(id))).status).toBe(404);
    expect((await leechRoute.GET(req(a.id), ctx(id))).status).toBe(404);
  }
  expect((await db.select().from(decks).where(eq(decks.id, theirs.id)))[0].deletedAt).toBeNull();

  expect((await route.DELETE(req(a.id, { method: "DELETE" }), ctx(deck.id))).status).toBe(204);
  expect((await db.select().from(decks).where(eq(decks.id, deck.id)))[0].deletedAt).not.toBeNull();
  const rows = await db.select().from(cards).where(eq(cards.deckId, deck.id));
  expect(rows.every((r) => r.deletedAt !== null)).toBe(true);
  expect((await db.select().from(cardState)).length).toBe(3);
  expect((await db.select().from(reviewLog)).length).toBe(3);
  expect((await route.GET(req(a.id), ctx(deck.id))).status).toBe(404);
  expect((await leechRoute.GET(req(a.id), ctx(deck.id))).status).toBe(404);
});

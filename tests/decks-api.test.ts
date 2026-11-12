import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("library and deck reads are scoped to the current profile", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_decks_api");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { decks } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const a = await f.createProfile(db, { name: "A" });
  const b = await f.createProfile(db, { name: "B" });
  const da = await f.createDeck(db, a.id, { name: "Bio" });
  const gone = await f.createDeck(db, a.id, { name: "Gone" });
  await db.update(decks).set({ deletedAt: new Date() }).where(eq(decks.id, gone.id));
  const db1 = await f.createDeck(db, b.id, { name: "Chem" });
  await f.createCard(db, da.id, { topic: "Cells" });
  await f.createCard(db, da.id, { topic: "Cells" });
  await f.createCard(db, da.id, { topic: "Genes" });
  await f.createCard(db, db1.id);

  const lib = await import("@/app/api/v1/library/route");
  const deck = await import("@/app/api/v1/decks/[id]/route");
  const req = (p: string) => new Request("http://x/", { headers: asProfile(p) });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  const names = (body: { groups: { decks: { name: string }[] }[] }) =>
    body.groups.flatMap((g) => g.decks.map((d) => d.name));
  const body = await (await lib.GET(req(a.id))).json();
  expect(names(body)).toEqual(["Bio"]);
  expect(body.groups[0].decks[0].cardCount).toBe(3);
  const bBody = await (await lib.GET(req(b.id))).json();
  expect(names(bBody)).toEqual(["Chem"]);
  expect(bBody.groups[0].decks[0].cardCount).toBe(1);
  expect((await lib.GET(new Request("http://x/"))).status).toBe(401);

  const own = await deck.GET(req(a.id), ctx(da.id));
  expect(own.status).toBe(200);
  expect(
    (await own.json()).deck.topics.map((t: { topic: string; cardCount: number }) => [
      t.topic,
      t.cardCount,
    ]),
  ).toEqual([
    ["Cells", 2],
    ["Genes", 1],
  ]);

  const other = await deck.GET(req(a.id), ctx(db1.id));
  const unknown = await deck.GET(req(a.id), ctx("00000000-0000-4000-8000-000000000000"));
  expect(other.status).toBe(404);
  expect(await other.json()).toEqual(await unknown.json());
  expect((await deck.GET(req(a.id), ctx(gone.id))).status).toBe(404);
  expect((await deck.GET(req(a.id), ctx("nope"))).status).toBe(404);
});

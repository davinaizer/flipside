import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("library counts use the local day, domain weak rule and exclude deleted and foreign data", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_library_counts");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { getLibrary } = await import("@/server/decks");
  const { librarySchema } = await import("@/shared/schemas/library");
  const { cards, decks } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  // 06:30 London on 2 Feb is still learning day 1 Feb (day starts at 07:00).
  const now = new Date("2026-02-02T06:30:00Z");
  const me = await f.createProfile(db, { name: "Me", settings: { cardsPerSession: 10 } });
  const other = await f.createProfile(db, { name: "Other" });

  const zeta = await f.createDeck(db, me.id, { name: "Zeta", groupName: "Science" });
  const alpha = await f.createDeck(db, me.id, { name: "Alpha", groupName: "Art" });
  const loose = await f.createDeck(db, me.id, { name: "Loose" });
  const gone = await f.createDeck(db, me.id, { name: "Gone", groupName: "Art" });
  const foreign = await f.createDeck(db, other.id, { name: "Foreign" });

  const mk = async (deckId: string, topic: string, state?: Record<string, unknown>) => {
    const c = await f.createCard(db, deckId, { topic });
    if (state) await f.createCardState(db, me.id, c.id, state);
    return c;
  };
  // Zeta: new, box1 due today (weak), box1 due tomorrow (weak), box3 due yesterday, box5 not due, leech box4 due.
  await mk(zeta.id, "Cells");
  await mk(zeta.id, "Cells", { box: 1, reps: 1, dueDate: "2026-02-01" });
  await mk(zeta.id, "Genes", { box: 1, reps: 2, dueDate: "2026-02-02" });
  await mk(zeta.id, "Genes", { box: 3, dueDate: "2026-01-31" });
  await mk(zeta.id, "Genes", { box: 5, dueDate: "2026-03-01" });
  await mk(zeta.id, "Cells", { box: 4, dueDate: "2026-02-01", status: "leech", lapses: 8 });
  // suspended: counted in the bucket but never due or weak.
  await mk(zeta.id, "Cells", { box: 1, reps: 1, dueDate: "2026-01-01", status: "suspended" });
  const deadCard = await mk(zeta.id, "Dead", { box: 1, reps: 1, dueDate: "2026-01-01" });
  await db.update(cards).set({ deletedAt: new Date() }).where(eq(cards.id, deadCard.id));
  await mk(alpha.id, "Sketch", { box: 2, dueDate: "2026-02-01" });
  await mk(loose.id, "Misc");
  const goneCard = await mk(gone.id, "X", { box: 1, reps: 1, dueDate: "2026-01-01" });
  await db.update(decks).set({ deletedAt: new Date() }).where(eq(decks.id, gone.id));
  expect(goneCard.id).toBeTruthy();
  const fc = await f.createCard(db, foreign.id);
  await f.createCardState(db, other.id, fc.id, { dueDate: "2026-01-01" });

  const lib = librarySchema.parse(await getLibrary(me, now, db));
  expect(lib.groups.map((g) => g.name)).toEqual(["Art", "Science", "Other"]);
  // Due on 1 Feb: box1 (Feb 1), box1 (Feb 2 is tomorrow: no), box3, leech, Sketch = 4.
  expect(lib.today).toEqual({ dueCount: 4, startableCount: 6, decksWithDue: 2, sessionLength: 10, weakCount: 3 });

  const z = lib.groups[1]!.decks[0]!;
  expect(z.name).toBe("Zeta");
  expect(z.topicCount).toBe(2);
  expect(z.topics).toEqual(["Cells", "Genes"]);
  expect(z.cardCount).toBe(7);
  expect(z.dueCount).toBe(3);
  expect(z.mastery).toEqual({ new: 1, notYet: 3, nearly: 1, gotIt: 2 });
  expect(lib.groups[2]!.decks[0]).toMatchObject({ name: "Loose", cardCount: 1, dueCount: 0 });
  expect(lib.groups[2]!.decks[0]!.mastery.new).toBe(1);

  // After the day start, 2 Feb becomes today and the Feb 2 card is due too.
  const later = await getLibrary(me, new Date("2026-02-02T07:00:00Z"), db);
  expect(later.today.dueCount).toBe(5);
});

test("a deck of only New cards is startable until the daily new-card cap is used", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_library_startable");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { getLibrary, getDeck } = await import("@/server/decks");

  const now = new Date("2026-02-02T12:00:00Z");
  const me = await f.createProfile(db, { name: "Me", settings: { newCardsPerDay: 2 } });
  const empty = await getLibrary(me, now, db);
  expect(empty.today.startableCount).toBe(0);

  const deck = await f.createDeck(db, me.id, { name: "Fresh" });
  const made = [await f.createCard(db, deck.id), await f.createCard(db, deck.id), await f.createCard(db, deck.id)];
  expect((await getLibrary(me, now, db)).today.startableCount).toBe(2);
  expect((await getDeck(me, deck.id, now, db)).deck.newRemaining).toBe(2);

  // Two cards introduced today (after the 07:00 start) use the cap; an undone one would not.
  for (const c of made.slice(0, 2)) {
    await f.createReviewLog(db, me.id, c.id, { introducedNew: true, reviewedAt: new Date("2026-02-02T09:00:00Z") });
  }
  expect((await getLibrary(me, now, db)).today.startableCount).toBe(0);
  expect((await getDeck(me, deck.id, now, db)).deck.newRemaining).toBe(0);
});

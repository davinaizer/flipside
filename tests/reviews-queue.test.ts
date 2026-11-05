import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("grading follows the replayed queue: only the current card, and a deleted card no longer blocks completion", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_reviews_queue");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { putReview } = await import("@/server/reviews");
  const { putSession } = await import("@/server/sessions");
  const { cards, sessions } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const t0 = new Date("2026-02-02T10:00:00Z").getTime();
  const at = (min: number) => new Date(t0 + min * 60_000);
  const me = await f.createProfile(db, { name: "Me" });
  const deck = await f.createDeck(db, me.id);
  const [a, b, c] = [
    await f.createCard(db, deck.id),
    await f.createCard(db, deck.id),
    await f.createCard(db, deck.id),
  ];

  const session = async (cardIds: string[]) => {
    const [row] = await db
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        profileId: me.id,
        scope: { kind: "all" },
        plannedCount: cardIds.length,
        startedAt: at(0),
        meta: { length: "all", cardIds },
      })
      .returning();
    return row!.id;
  };
  const grade = (sessionId: string, cardId: string, g: string, min: number) =>
    putReview(
      me,
      crypto.randomUUID(),
      { sessionId, cardId, grade: g, durationMs: 1000 },
      at(min),
      db,
    );
  const ended = async (id: string) =>
    (await db.select().from(sessions).where(eq(sessions.id, id)))[0]!;

  // Out of order: the queue is a, b, c, so b is refused while a is current; a then b is accepted.
  const s1 = await session([a!.id, b!.id, c!.id]);
  await expect(grade(s1, b!.id, "got_it", 1)).rejects.toMatchObject({
    status: 409,
    code: "not_current_card",
  });
  await grade(s1, a!.id, "not_yet", 2);
  // a is re-queued at the end (fewer than four cards remain), so it is not current until b and c are done.
  await expect(grade(s1, a!.id, "got_it", 3)).rejects.toMatchObject({
    status: 409,
    code: "not_current_card",
  });
  await grade(s1, b!.id, "got_it", 4);
  await grade(s1, c!.id, "got_it", 5);
  expect((await ended(s1)).endedAt).toBeNull();
  await grade(s1, a!.id, "got_it", 6);
  expect(await ended(s1)).toMatchObject({ endedAt: at(6), endedReason: "completed" });

  // Deleted mid-session: b, graded Not yet and re-queued, is deleted. The queue replays over a
  // and c only, and grading them completes the session.
  const s2 = await session([b!.id, a!.id, c!.id]);
  await grade(s2, b!.id, "not_yet", 10);
  await db
    .update(cards)
    .set({ deletedAt: at(11) })
    .where(eq(cards.id, b!.id));
  const resumed = await putSession(me, s2, {}, at(12), db);
  expect(resumed.queue.map((q) => q.cardId)).toEqual([a!.id, c!.id]);
  await grade(s2, a!.id, "got_it", 13);
  await expect(grade(s2, b!.id, "got_it", 14)).rejects.toMatchObject({
    status: 404,
    code: "card_not_found",
  });
  await grade(s2, c!.id, "got_it", 15);
  expect(await ended(s2)).toMatchObject({ endedAt: at(15), endedReason: "completed" });
});

import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("DELETE /reviews/{id} undoes the latest grade, steps back through the session and is safe to repeat (AC6)", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_reviews_undo");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { putReview, undoReview } = await import("@/server/reviews");
  const { newCardsRemaining } = await import("@/server/decks");
  const { reviewResponseSchema, undoResponseSchema } = await import("@/shared/schemas/review");
  const { cardState, reviewLog, sessions } = await import("@/server/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const route = await import("@/app/api/v1/reviews/[id]/route");

  // 10:00 London on 2 Feb: learning day 2026-02-02 (day starts 07:00). Each step is a minute apart.
  const t0 = new Date("2026-02-02T10:00:00Z").getTime();
  const at = (min: number) => new Date(t0 + min * 60_000);
  const me = await f.createProfile(db, { name: "Me" });
  const other = await f.createProfile(db, { name: "Other" });
  const deck = await f.createDeck(db, me.id);
  const fresh = await f.createCard(db, deck.id);
  const box3 = await f.createCard(db, deck.id);
  const box2 = await f.createCard(db, deck.id);
  const lastReviewed = new Date("2026-01-30T09:00:00Z");
  const box3Before = {
    box: 3,
    dueDate: "2026-02-01",
    reps: 4,
    lapses: 1,
    lastGrade: "got_it",
    status: "active",
    lastReviewedAt: lastReviewed,
  } as const;
  const box2Before = {
    box: 2,
    dueDate: "2026-02-02",
    reps: 1,
    lapses: 0,
    lastGrade: "got_it",
    status: "active",
    lastReviewedAt: lastReviewed,
  } as const;
  await f.createCardState(db, me.id, box3.id, box3Before);
  await f.createCardState(db, me.id, box2.id, box2Before);

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
  const sid = await session([fresh.id, box3.id, box2.id]);
  const grade = async (cardId: string, g: string, min: number, sessionId = sid) => {
    const id = crypto.randomUUID();
    reviewResponseSchema.parse(
      await putReview(me, id, { sessionId, cardId, grade: g, durationMs: 3000 }, at(min), db),
    );
    return id;
  };
  const undo = async (id: string, min: number, profile = me) =>
    undoResponseSchema.parse(await undoReview(profile, id, at(min), db));
  const logOf = async (id: string) =>
    (await db.select().from(reviewLog).where(eq(reviewLog.id, id)))[0]!;
  const stateOf = async (cardId: string) =>
    (
      await db
        .select()
        .from(cardState)
        .where(and(eq(cardState.profileId, me.id), eq(cardState.cardId, cardId)))
    )[0];
  expect(await stateOf(box2.id)).toMatchObject(box2Before);

  // The session: New card Got it, box 3 Nearly, box 2 Not yet (lapse, re-queued) then Got it.
  const rFresh = await grade(fresh.id, "got_it", 1);
  const rBox3 = await grade(box3.id, "nearly", 2);
  const rNotYet = await grade(box2.id, "not_yet", 3);
  const rRequeued = await grade(box2.id, "got_it", 4);
  expect(await newCardsRemaining(me, "2026-02-02", db)).toBe(9);

  // Only the latest live review of the session can be undone; another profile gets 404.
  for (const id of [rFresh, rBox3, rNotYet])
    await expect(undoReview(me, id, at(5), db)).rejects.toMatchObject({
      status: 409,
      code: "not_latest_review",
    });
  await expect(undoReview(other, rRequeued, at(5), db)).rejects.toMatchObject({
    status: 404,
    code: "review_not_found",
  });
  await expect(undoReview(me, crypto.randomUUID(), at(5), db)).rejects.toMatchObject({
    status: 404,
  });
  await expect(undoReview(me, "nope", at(5), db)).rejects.toMatchObject({ status: 400 });

  // Undo the re-queued attempt: back to the state the Not yet left, labels for box 1.
  const u4 = await undo(rRequeued, 5);
  expect(u4).toEqual({
    review: {
      id: rRequeued,
      sessionId: sid,
      cardId: box2.id,
      grade: "got_it",
      reviewedAt: at(4).toISOString(),
      undoneAt: at(5).toISOString(),
    },
    state: {
      box: 1,
      dueDate: "2026-02-02",
      reps: 2,
      lapses: 1,
      lastGrade: "not_yet",
      status: "active",
    },
    labels: { not_yet: "Again today", nearly: "Again today", got_it: "Tomorrow" },
  });
  expect(await stateOf(box2.id)).toMatchObject({
    box: 1,
    reps: 2,
    lapses: 1,
    lastReviewedAt: at(3),
  });
  // The row stays, marked undone; a repeated DELETE answers the same and changes nothing.
  expect(await logOf(rRequeued)).toMatchObject({ undoneAt: at(5), grade: "got_it", boxAfter: 2 });
  expect(await undo(rRequeued, 6)).toEqual(u4);
  expect(await logOf(rRequeued)).toMatchObject({ undoneAt: at(5) });
  // The re-queued attempt is open again, so the card can be graded once more.
  const rRegrade = await grade(box2.id, "nearly", 6);
  expect(await logOf(rRegrade)).toMatchObject({ isFirstAttemptToday: false, boxBefore: 1 });
  await undo(rRegrade, 7);

  // Step back through the rest of the session, newest first.
  const u3 = await undo(rNotYet, 8);
  expect(u3.state).toEqual({
    box: 2,
    dueDate: "2026-02-02",
    reps: 1,
    lapses: 0,
    lastGrade: "got_it",
    status: "active",
  });
  expect(u3.labels).toEqual({ not_yet: "Again today", nearly: "Tomorrow", got_it: "In 3 days" });
  expect(await stateOf(box2.id)).toMatchObject(box2Before);

  const u2 = await undo(rBox3, 9);
  expect(u2.state).toEqual({
    box: 3,
    dueDate: "2026-02-01",
    reps: 4,
    lapses: 1,
    lastGrade: "got_it",
    status: "active",
  });
  expect(u2.labels).toEqual({ not_yet: "Again today", nearly: "In 3 days", got_it: "In 7 days" });
  expect(await stateOf(box3.id)).toMatchObject(box3Before);

  // The card was New: its state row goes, and the new-card allowance recovers.
  const u1 = await undo(rFresh, 10);
  expect(u1.state).toBeNull();
  expect(u1.labels).toEqual({ not_yet: "Again today", nearly: "Again today", got_it: "Tomorrow" });
  expect(await stateOf(fresh.id)).toBeUndefined();
  expect(await newCardsRemaining(me, "2026-02-02", db)).toBe(10);
  // Nothing live is left, so a repeat of any undo is still safe.
  expect(await undo(rBox3, 11)).toEqual(u2);
  for (const id of [rFresh, rBox3, rNotYet, rRequeued, rRegrade])
    expect((await logOf(id)).undoneAt).not.toBeNull();

  // Regrading is a first attempt again, and the New card counts toward the cap once more.
  const g1 = await grade(fresh.id, "nearly", 12);
  expect(await logOf(g1)).toMatchObject({
    isFirstAttemptToday: true,
    introducedNew: true,
    boxBefore: null,
    boxAfter: 1,
  });
  await grade(box3.id, "nearly", 12.5); // the queue is fresh, box3, box2: grades follow it
  const g2 = await grade(box2.id, "got_it", 13);
  expect(await logOf(g2)).toMatchObject({ isFirstAttemptToday: true, boxBefore: 2, boxAfter: 3 });
  expect(await newCardsRemaining(me, "2026-02-02", db)).toBe(9);

  // A later grade of the same card in another session blocks undoing the older one.
  const sid2 = await session([box2.id]);
  await grade(box2.id, "nearly", 14, sid2);
  await expect(undoReview(me, g2, at(15), db)).rejects.toMatchObject({
    status: 409,
    code: "not_latest_review",
  });

  // Through the route: header profile, the restored state and labels, auth and scoping.
  const req = (p: string | null) =>
    new Request("http://x/", { method: "DELETE", headers: p ? { "x-profile-id": p } : {} });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const res = await route.DELETE(req(me.id), ctx(rRequeued));
  expect(res.status).toBe(200);
  expect(undoResponseSchema.parse(await res.json())).toEqual(u4);
  expect((await route.DELETE(req(me.id), ctx(g1))).status).toBe(409);
  expect((await route.DELETE(req(me.id), ctx("nope"))).status).toBe(400);
  expect((await route.DELETE(req(null), ctx(rRequeued))).status).toBe(401);
  expect((await route.DELETE(req(other.id), ctx(rRequeued))).status).toBe(404);
});

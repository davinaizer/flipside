import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("PUT /reviews/{id} applies the scheduler, logs every field, re-queues at most twice and is idempotent (AC4)", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_reviews_put");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { putReview } = await import("@/server/reviews");
  const { reviewResponseSchema } = await import("@/shared/schemas/review");
  const { cardState, reviewLog, sessions } = await import("@/server/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const route = await import("@/app/api/v1/reviews/[id]/route");

  // 10:00 London on 2 Feb: learning day 2026-02-02 (day starts 07:00).
  const now = new Date("2026-02-02T10:00:00Z");
  const me = await f.createProfile(db, { name: "Me" });
  const other = await f.createProfile(db, { name: "Other" });
  const deck = await f.createDeck(db, me.id);
  const theirDeck = await f.createDeck(db, other.id);
  const fresh = await f.createCard(db, deck.id);
  const box3 = await f.createCard(db, deck.id);
  const box2 = await f.createCard(db, deck.id);
  const outside = await f.createCard(db, deck.id);
  const foreign = await f.createCard(db, theirDeck.id);
  const lastReviewed = new Date("2026-01-30T09:00:00Z");
  await f.createCardState(db, me.id, box3.id, {
    box: 3,
    dueDate: "2026-02-01",
    reps: 4,
    lapses: 1,
    lastGrade: "got_it",
    lastReviewedAt: lastReviewed,
  });
  await f.createCardState(db, me.id, box2.id, {
    box: 2,
    dueDate: "2026-02-02",
    reps: 1,
    lapses: 0,
    lastGrade: "got_it",
  });

  const session = async (profileId: string, cardIds: string[]) => {
    const [row] = await db
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        profileId,
        scope: { kind: "all" },
        plannedCount: cardIds.length,
        startedAt: now,
        meta: { length: "all", cardIds },
      })
      .returning();
    return row!.id;
  };
  // The foreign card in my session's meta stands for a profile mismatch the queue check alone would miss.
  const sid = await session(me.id, [fresh.id, box3.id, box2.id, foreign.id]);
  const theirSid = await session(other.id, [foreign.id]);

  const grade = async (
    cardId: string,
    g: string,
    opts: { id?: string; at?: Date; sessionId?: string; profile?: typeof me } = {},
  ) =>
    reviewResponseSchema.parse(
      await putReview(
        opts.profile ?? me,
        opts.id ?? crypto.randomUUID(),
        { sessionId: opts.sessionId ?? sid, cardId, grade: g, durationMs: 4200 },
        opts.at ?? now,
        db,
      ),
    );
  const logOf = async (id: string) =>
    (await db.select().from(reviewLog).where(eq(reviewLog.id, id)))[0]!;
  const stateOf = async (cardId: string) =>
    (
      await db
        .select()
        .from(cardState)
        .where(and(eq(cardState.profileId, me.id), eq(cardState.cardId, cardId)))
    )[0];

  // New card, Got it: enters box 2, due tomorrow; counts toward the new-card cap.
  const newId = crypto.randomUUID();
  const r1 = await grade(fresh.id, "got_it", { id: newId });
  expect(r1).toEqual({
    review: {
      id: newId,
      sessionId: sid,
      cardId: fresh.id,
      grade: "got_it",
      reviewedAt: now.toISOString(),
    },
    state: {
      box: 2,
      dueDate: "2026-02-03",
      reps: 1,
      lapses: 0,
      lastGrade: "got_it",
      status: "active",
    },
    requeue: false,
    labels: null,
  });
  expect(await stateOf(fresh.id)).toMatchObject({
    box: 2,
    dueDate: "2026-02-03",
    reps: 1,
    lapses: 0,
    lastGrade: "got_it",
    status: "active",
    lastReviewedAt: now,
  });
  expect(await logOf(newId)).toMatchObject({
    profileId: me.id,
    cardId: fresh.id,
    sessionId: sid,
    grade: "got_it",
    durationMs: 4200,
    reviewedAt: now,
    isFirstAttemptToday: true,
    introducedNew: true,
    boxBefore: null,
    boxAfter: 2,
    dueAfter: "2026-02-03",
    prevState: null,
    undoneAt: null,
    confidence: null,
  });

  // A retry returns the original and does not double-count, even under a concurrent repeat.
  const [again, againToo] = await Promise.all([
    grade(fresh.id, "got_it", { id: newId }),
    grade(fresh.id, "nearly", { id: newId }),
  ]);
  expect(again).toEqual(r1);
  expect(againToo).toEqual(r1);
  expect(await stateOf(fresh.id)).toMatchObject({ reps: 1, box: 2 });
  expect((await db.select().from(reviewLog).where(eq(reviewLog.cardId, fresh.id))).length).toBe(1);
  // Each queue entry takes one grade: the card was not re-queued, so another grade is refused.
  await expect(grade(fresh.id, "nearly")).rejects.toMatchObject({
    status: 409,
    code: "no_attempt_left",
  });

  // Box 3, Nearly: stays in box 3, due in 3 days; prev_state keeps the whole row for undo.
  const nearlyId = crypto.randomUUID();
  const r2 = await grade(box3.id, "nearly", { id: nearlyId });
  expect(r2.state).toEqual({
    box: 3,
    dueDate: "2026-02-05",
    reps: 5,
    lapses: 1,
    lastGrade: "nearly",
    status: "active",
  });
  expect(r2).toMatchObject({ requeue: false, labels: null });
  expect(await logOf(nearlyId)).toMatchObject({
    introducedNew: false,
    isFirstAttemptToday: true,
    boxBefore: 3,
    boxAfter: 3,
    dueAfter: "2026-02-05",
    prevState: {
      box: 3,
      dueDate: "2026-02-01",
      reps: 4,
      lapses: 1,
      lastGrade: "got_it",
      status: "active",
      lastReviewedAt: lastReviewed.toISOString(),
    },
  });

  // Box 2, Not yet: lapse, box 1, due today, re-queued with fresh labels for box 1.
  const nyIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const ny1 = await grade(box2.id, "not_yet", { id: nyIds[0] });
  expect(ny1.state).toEqual({
    box: 1,
    dueDate: "2026-02-02",
    reps: 2,
    lapses: 1,
    lastGrade: "not_yet",
    status: "active",
  });
  expect(ny1.requeue).toBe(true);
  expect(ny1.labels).toEqual({ not_yet: "Again today", nearly: "Again today", got_it: "Tomorrow" });
  expect(await logOf(nyIds[0]!)).toMatchObject({
    isFirstAttemptToday: true,
    boxBefore: 2,
    boxAfter: 1,
    dueAfter: "2026-02-02",
  });

  // The re-queued attempts are logged but are not first attempts; the second Not yet re-queues
  // once more, the third does not (two re-queues per card), and a fourth attempt is refused.
  const later = (min: number) => new Date(now.getTime() + min * 60_000);
  const ny2 = await grade(box2.id, "not_yet", { id: nyIds[1], at: later(2) });
  expect(ny2).toMatchObject({ requeue: true, state: { box: 1, lapses: 1, reps: 3 } });
  const ny3 = await grade(box2.id, "not_yet", { id: nyIds[2], at: later(4) });
  expect(ny3).toMatchObject({ requeue: false, labels: null, state: { box: 1, reps: 4 } });
  for (const id of nyIds.slice(1))
    expect(await logOf(id)).toMatchObject({
      isFirstAttemptToday: false,
      introducedNew: false,
      boxBefore: 1,
    });
  await expect(grade(box2.id, "got_it", { at: later(6) })).rejects.toMatchObject({
    status: 409,
    code: "no_attempt_left",
  });
  // A retry of an earlier re-queued grade still answers as first given.
  expect(await grade(box2.id, "not_yet", { id: nyIds[0], at: later(8) })).toEqual(ny1);

  // A card outside the queue is refused; so is another profile's session.
  await expect(grade(outside.id, "got_it")).rejects.toMatchObject({
    status: 409,
    code: "card_not_in_session",
  });
  await expect(grade(foreign.id, "got_it", { sessionId: theirSid })).rejects.toMatchObject({
    status: 404,
    code: "session_not_found",
  });
  await expect(grade(fresh.id, "got_it", { sessionId: crypto.randomUUID() })).rejects.toMatchObject(
    { status: 404 },
  );
  // Section 10: a card whose deck has another owner never gets my card_state, even from my queue.
  await expect(grade(foreign.id, "got_it")).rejects.toMatchObject({
    status: 404,
    code: "card_not_found",
  });
  expect(await stateOf(foreign.id)).toBeUndefined();
  // Another profile reusing my review id learns nothing.
  await expect(
    grade(foreign.id, "got_it", { id: newId, sessionId: theirSid, profile: other }),
  ).rejects.toMatchObject({ status: 404 });

  // First attempt is per learning day across sessions; the next day starts afresh.
  const sid2 = await session(me.id, [box3.id, fresh.id]);
  const sameDayId = crypto.randomUUID();
  await grade(box3.id, "got_it", { id: sameDayId, sessionId: sid2, at: later(10) });
  expect(await logOf(sameDayId)).toMatchObject({
    isFirstAttemptToday: false,
    boxBefore: 3,
    boxAfter: 4,
    dueAfter: "2026-02-09",
  });
  const nextDayId = crypto.randomUUID();
  const nextDay = await grade(fresh.id, "got_it", {
    id: nextDayId,
    sessionId: sid2,
    at: new Date("2026-02-03T08:00:00Z"),
  });
  expect(nextDay.state).toMatchObject({ box: 3, dueDate: "2026-02-06" });
  expect(await logOf(nextDayId)).toMatchObject({ isFirstAttemptToday: true, introducedNew: false });

  // Through the route: header profile, validation and auth.
  const req = (p: string | null, body: string) =>
    new Request("http://x/", {
      method: "PUT",
      headers: p
        ? asProfile(p, { "content-type": "application/json" })
        : { "content-type": "application/json" },
      body,
    });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const sid3 = await session(me.id, [outside.id]);
  const body = JSON.stringify({
    sessionId: sid3,
    cardId: outside.id,
    grade: "nearly",
    durationMs: 1500,
  });
  const res = await route.PUT(req(me.id, body), ctx(crypto.randomUUID()));
  expect(res.status).toBe(200);
  expect(reviewResponseSchema.parse(await res.json())).toMatchObject({
    state: { box: 1, lastGrade: "nearly" },
    requeue: false,
  });
  expect((await route.PUT(req(me.id, "{"), ctx(crypto.randomUUID()))).status).toBe(400);
  expect(
    (
      await route.PUT(
        req(
          me.id,
          JSON.stringify({ sessionId: sid3, cardId: outside.id, grade: "maybe", durationMs: 1 }),
        ),
        ctx(crypto.randomUUID()),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await route.PUT(
        req(
          me.id,
          JSON.stringify({ sessionId: sid3, cardId: outside.id, grade: "nearly", durationMs: -1 }),
        ),
        ctx(crypto.randomUUID()),
      )
    ).status,
  ).toBe(400);
  expect((await route.PUT(req(me.id, body), ctx("nope"))).status).toBe(400);
  expect((await route.PUT(req(null, body), ctx(crypto.randomUUID()))).status).toBe(401);
  expect((await route.PUT(req(other.id, body), ctx(crypto.randomUUID()))).status).toBe(404);
});

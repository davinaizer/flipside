import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("end keeps grades, the last grade completes, and the summary counts first grades (R7, R11)", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_sessions_end");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { putReview, undoReview } = await import("@/server/reviews");
  const { endSession, getSummary } = await import("@/server/sessions");
  const { sessionEndResponseSchema, sessionSummarySchema } = await import("@/shared/schemas/session");
  const { sessions, reviewLog } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const endRoute = await import("@/app/api/v1/sessions/[id]/end/route");
  const summaryRoute = await import("@/app/api/v1/sessions/[id]/summary/route");

  const t0 = new Date("2026-02-02T10:00:00Z").getTime();
  const at = (min: number) => new Date(t0 + min * 60_000);
  const me = await f.createProfile(db, { name: "Me" });
  const other = await f.createProfile(db, { name: "Other" });
  const deck = await f.createDeck(db, me.id);
  const c = [] as Awaited<ReturnType<typeof f.createCard>>[];
  for (let i = 0; i < 6; i++) c.push(await f.createCard(db, deck.id));

  const session = async (cardIds: string[]) => {
    const [row] = await db
      .insert(sessions)
      .values({ id: crypto.randomUUID(), profileId: me.id, scope: { kind: "all" }, plannedCount: cardIds.length, startedAt: at(0), meta: { length: "all", cardIds } })
      .returning();
    return row!.id;
  };
  const grade = async (sid: string, cardId: string, g: string, min: number) => {
    const id = crypto.randomUUID();
    await putReview(me, id, { sessionId: sid, cardId, grade: g, durationMs: 1000 }, at(min), db);
    return id;
  };
  const row = async (sid: string) => (await db.select().from(sessions).where(eq(sessions.id, sid)))[0]!;

  // Completion: a Not yet re-queues, so the session is open until the card is settled.
  const s1 = await session([c[0]!.id, c[1]!.id, c[2]!.id, c[3]!.id]);
  await grade(s1, c[0]!.id, "got_it", 1);
  const notYet = await grade(s1, c[1]!.id, "not_yet", 2);
  await grade(s1, c[2]!.id, "nearly", 3);
  await grade(s1, c[3]!.id, "not_yet", 4);
  expect(await row(s1)).toMatchObject({ endedAt: null, endedReason: null });
  await grade(s1, c[1]!.id, "got_it", 5);
  await grade(s1, c[3]!.id, "not_yet", 6); // second Not yet re-queues again
  expect((await row(s1)).endedAt).toBeNull();
  await grade(s1, c[3]!.id, "nearly", 7);
  expect(await row(s1)).toMatchObject({ endedAt: at(7), endedReason: "completed" });
  void notYet;

  const sum1 = sessionSummarySchema.parse(await getSummary(me, s1, db));
  // First grades: got_it, not_yet, nearly, not_yet.
  expect(sum1.counts).toEqual({ not_yet: 2, nearly: 1, got_it: 1 });
  expect(sum1.gradedCount).toBe(4);
  expect(sum1.durationMs).toBe(7 * 60_000);
  expect(sum1.missIds).toEqual([c[1]!.id, c[3]!.id]);
  expect(sum1.goAgain.map((g) => g.cardId)).toEqual([c[1]!.id, c[3]!.id]);
  expect(sum1.goAgain[0]).toMatchObject({ front: c[1]!.front, topic: c[1]!.topic, deckName: deck.name });
  expect(sum1).toMatchObject({ deckName: deck.name, severalDecks: false });
  // Ending a completed session changes nothing.
  expect((await endSession(me, s1, at(30), db)).session).toEqual({ id: s1, endedAt: at(7).toISOString(), endedReason: "completed" });

  // End early: grades stay, reason is ended_early, a repeat answers the stored end.
  const s2 = await session(c.map((x) => x.id));
  await grade(s2, c[0]!.id, "not_yet", 1);
  await grade(s2, c[1]!.id, "got_it", 2);
  const ended = sessionEndResponseSchema.parse(await endSession(me, s2, at(10), db));
  expect(ended.session).toEqual({ id: s2, endedAt: at(10).toISOString(), endedReason: "ended_early" });
  expect(await endSession(me, s2, at(20), db)).toEqual(ended);
  expect((await db.select().from(reviewLog).where(eq(reviewLog.sessionId, s2))).length).toBe(2);
  const sum2 = await getSummary(me, s2, db);
  expect(sum2.counts).toEqual({ not_yet: 1, nearly: 0, got_it: 1 });
  expect(sum2.durationMs).toBe(10 * 60_000);

  // Undone reviews never count; the first live grade is the one that counts, and an open
  // session's time runs to its last grade.
  const s3 = await session([c[4]!.id, c[5]!.id]);
  const first = await grade(s3, c[4]!.id, "not_yet", 1);
  // The queue is c4, c5, c4 again: c5 comes next.
  const second = await grade(s3, c[5]!.id, "got_it", 2);
  await undoReview(me, second, at(3), db);
  await undoReview(me, first, at(3), db);
  await grade(s3, c[4]!.id, "nearly", 4);
  const sum3 = await getSummary(me, s3, db);
  expect(sum3.counts).toEqual({ not_yet: 0, nearly: 1, got_it: 0 });
  expect(sum3.gradedCount).toBe(1);
  expect(sum3.missIds).toEqual([]);
  expect(sum3.goAgain).toEqual([]);
  expect(sum3.durationMs).toBe(4 * 60_000);
  expect(sum3.session.endedAt).toBeNull();

  // More than three misses: three shown, all ids kept. Each Not yet re-queues ahead of the
  // last card, so grading in queue order misses the first five.
  const s4 = await session(c.map((x) => x.id));
  for (const [i, x] of c.slice(0, 5).entries()) await grade(s4, x.id, "not_yet", i + 1);
  const sum4 = await getSummary(me, s4, db);
  expect(sum4.goAgain.length).toBe(3);
  expect(sum4.missIds.length).toBe(5);

  // Several decks: no single name, the flag is set.
  const deck2 = await f.createDeck(db, me.id);
  const d2card = await f.createCard(db, deck2.id);
  const sum6 = await getSummary(me, await session([c[0]!.id, d2card.id]), db);
  expect(sum6).toMatchObject({ deckName: null, severalDecks: true });

  // Routes: profile header, 404 for another profile or unknown id, 400-free bad id is 404.
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const req = (method: string, p: string | null) => new Request("http://x/", { method, headers: p ? { "x-profile-id": p } : {} });
  const s5 = await session([c[0]!.id]);
  const res = await endRoute.POST(req("POST", me.id), ctx(s5));
  expect(res.status).toBe(200);
  expect(sessionEndResponseSchema.parse(await res.json()).session.endedReason).toBe("ended_early");
  expect(sessionSummarySchema.parse(await (await summaryRoute.GET(req("GET", me.id), ctx(s5))).json()).session.id).toBe(s5);
  for (const id of [s1, crypto.randomUUID(), "nope"]) {
    expect((await endRoute.POST(req("POST", other.id), ctx(id))).status).toBe(404);
    expect((await summaryRoute.GET(req("GET", other.id), ctx(id))).status).toBe(404);
  }
  expect((await summaryRoute.GET(req("GET", null), ctx(s1))).status).toBe(401);
  expect((await row(s1)).endedReason).toBe("completed");
});

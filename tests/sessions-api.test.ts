import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("PUT /sessions/{id} builds, stores and resumes the queue", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_sessions_create");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { putSession } = await import("@/server/sessions");
  const { sessionResponseSchema } = await import("@/shared/schemas/session");
  const { images, sessions } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const route = await import("@/app/api/v1/sessions/[id]/route");

  // 10:00 London on 2 Feb: learning day 2026-02-02.
  const now = new Date("2026-02-02T10:00:00Z");
  const me = await f.createProfile(db, { name: "Me", settings: { newCardsPerDay: 10 } });
  const other = await f.createProfile(db, { name: "Other" });
  const bio = await f.createDeck(db, me.id, { name: "Bio", answerStyle: "bullets" });
  const chem = await f.createDeck(db, me.id, { name: "Chem" });
  const theirs = await f.createDeck(db, other.id, { name: "Theirs" });

  const [img] = await db
    .insert(images)
    .values({
      ownerProfileId: me.id,
      sha256: "a".repeat(64),
      mime: "image/png",
      bytes: 10,
      width: 4,
      height: 3,
      storageKey: "k",
    })
    .returning();

  const due = async (
    deckId: string,
    topic: string,
    state: Record<string, unknown>,
    over: Record<string, unknown> = {},
  ) => {
    const c = await f.createCard(db, deckId, { topic, ...over });
    await f.createCardState(db, me.id, c.id, state);
    return c;
  };
  // Due cards with distinct (box, due date), so the order has no shuffled ties.
  const box3 = await due(
    bio.id,
    "Cells",
    { box: 3, dueDate: "2026-01-20" },
    { frontImageId: img.id },
  );
  const box1 = await due(bio.id, "Genes", { box: 1, reps: 2, dueDate: "2026-02-02" });
  const box1Old = await due(chem.id, "Atoms", { box: 1, reps: 1, dueDate: "2026-01-30" });
  const leech = await due(chem.id, "Atoms", {
    box: 4,
    dueDate: "2026-02-01",
    status: "leech",
    lapses: 8,
  });
  const notDue = await due(bio.id, "Cells", { box: 5, dueDate: "2026-03-01" });
  await due(bio.id, "Cells", { box: 1, dueDate: "2026-01-01", status: "suspended" });
  const deleted = await f.createCard(db, bio.id, { topic: "Cells", deletedAt: new Date() });
  // 16 New cards (AC7), in deck position order: 12 in Bio, 4 in Chem.
  const fresh = [];
  for (let i = 0; i < 16; i++)
    fresh.push(
      await f.createCard(db, i < 12 ? bio.id : chem.id, { topic: i < 12 ? "Cells" : "Atoms" }),
    );
  const foreignCard = await f.createCard(db, theirs.id);

  const put = async (id: string, body: unknown, profile = me) =>
    sessionResponseSchema.parse(await putSession(profile, id, body, now, db, () => 0));
  const ids = (r: { queue: { cardId: string }[] }) => r.queue.map((c) => c.cardId);
  const sid = () => crypto.randomUUID();

  // All, all due: due first by box then oldest due date, then New up to the cap of 10.
  const allId = sid();
  const all = await put(allId, { scope: { kind: "all" }, length: "all" });
  expect(ids(all)).toEqual([
    box1Old.id,
    box1.id,
    box3.id,
    leech.id,
    ...fresh.slice(0, 10).map((c) => c.id),
  ]);
  expect(ids(all)).not.toContain(notDue.id);
  expect(ids(all)).not.toContain(deleted.id);
  expect(ids(all)).not.toContain(foreignCard.id);
  expect(all.session).toMatchObject({
    id: allId,
    scope: { kind: "all" },
    length: "all",
    plannedCount: 14,
    endedAt: null,
    endedReason: null,
  });
  expect(all.session.startedAt).toBe(now.toISOString());
  expect(all.grades).toEqual([]);

  // Each card carries text, images and the labels the scheduler would give.
  const b3 = all.queue[2]!;
  expect(b3).toMatchObject({
    deckId: bio.id,
    deckName: "Bio",
    answerStyle: "bullets",
    topic: "Cells",
    front: box3.front,
    back: box3.back,
    frontImage: { id: img.id, url: `/api/v1/images/${img.id}`, width: 4, height: 3 },
    backImage: null,
    labels: { not_yet: "Again today", nearly: "In 3 days", got_it: "In 7 days" },
  });
  expect(all.queue[0]!.labels).toEqual({
    not_yet: "Again today",
    nearly: "Again today",
    got_it: "Tomorrow",
  });
  expect(all.queue[4]!).toMatchObject({
    answerStyle: "bullets",
    labels: { not_yet: "Again today", nearly: "Again today", got_it: "Tomorrow" },
  });

  // The ordered queue is stored in sessions.meta.
  const [stored] = await db.select().from(sessions).where(eq(sessions.id, allId));
  expect(stored.meta).toEqual({ length: "all", cardIds: ids(all) });
  expect(stored.profileId).toBe(me.id);
  expect(stored.plannedCount).toBe(14);

  // Every length cuts the same order.
  for (const length of [5, 10, 20] as const) {
    expect(ids(await put(sid(), { scope: { kind: "all" }, length }))).toEqual(
      ids(all).slice(0, length),
    );
  }

  // Deck, topics, practise-anyway topics and weak scopes.
  expect(
    ids(await put(sid(), { scope: { kind: "deck", deckId: chem.id }, length: "all" })),
  ).toEqual([box1Old.id, leech.id, ...fresh.slice(12).map((c) => c.id)]);
  expect(
    ids(
      await put(sid(), {
        scope: { kind: "topics", deckId: bio.id, topics: ["Genes"] },
        length: "all",
      }),
    ),
  ).toEqual([box1.id]);
  expect(
    ids(
      await put(sid(), {
        scope: { kind: "topics", deckId: bio.id, topics: ["Cells"], ignoreDue: true },
        length: 5,
      }),
    ),
  ).toEqual([box3.id, notDue.id, ...fresh.slice(0, 3).map((c) => c.id)]);
  expect(ids(await put(sid(), { scope: { kind: "weak" }, length: "all" }))).toEqual([
    box1Old.id,
    box1.id,
    leech.id,
  ]);

  // Explicit cards ("Practise the misses"): a foreign card is dropped, a not-due card is kept.
  const picked = await put(sid(), {
    scope: { kind: "cards", cardIds: [box1.id, foreignCard.id, notDue.id] },
    length: "all",
  });
  expect(ids(picked)).toContain(box1.id);
  expect(ids(picked)).toContain(notDue.id);
  expect(ids(picked)).not.toContain(foreignCard.id);
  expect(ids(picked)).toHaveLength(2);

  // A retry with the same id returns the identical queue, whatever the body says.
  const again = await put(allId, { scope: { kind: "weak" }, length: 5 });
  expect(again).toEqual(all);
  expect((await db.select().from(sessions).where(eq(sessions.id, allId))).length).toBe(1);

  // Grades so far come back on an empty-body resume, oldest first, undone ones left out.
  const g1 = await f.createReviewLog(db, me.id, box1Old.id, {
    sessionId: allId,
    grade: "not_yet",
    reviewedAt: new Date("2026-02-02T10:01:00Z"),
  });
  await f.createReviewLog(db, me.id, box1.id, {
    sessionId: allId,
    grade: "got_it",
    reviewedAt: new Date("2026-02-02T10:02:00Z"),
    undoneAt: new Date(),
  });
  const g2 = await f.createReviewLog(db, me.id, box1.id, {
    sessionId: allId,
    grade: "nearly",
    reviewedAt: new Date("2026-02-02T10:03:00Z"),
  });
  const resumed = await put(allId, null);
  expect(ids(resumed)).toEqual(ids(all));
  expect(resumed.grades).toEqual([
    {
      reviewId: g1.id,
      cardId: box1Old.id,
      grade: "not_yet",
      reviewedAt: "2026-02-02T10:01:00.000Z",
    },
    { reviewId: g2.id, cardId: box1.id, grade: "nearly", reviewedAt: "2026-02-02T10:03:00.000Z" },
  ]);

  // Through the route: header profile, empty body resumes, JSON body creates.
  const req = (p: string, body?: string) =>
    new Request("http://x/", {
      method: "PUT",
      headers: asProfile(p, { "content-type": "application/json" }),
      body,
    });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const viaRoute = await route.PUT(req(me.id), ctx(allId));
  expect(viaRoute.status).toBe(200);
  expect(ids(sessionResponseSchema.parse(await viaRoute.json()))).toEqual(ids(all));
  const created = await route.PUT(
    req(me.id, JSON.stringify({ scope: { kind: "weak" }, length: 5 })),
    ctx(sid()),
  );
  expect(created.status).toBe(200);
  expect(sessionResponseSchema.parse(await created.json()).queue).toHaveLength(3);

  // Another profile: their session, their deck and an unknown id are 404.
  expect((await route.PUT(req(other.id), ctx(allId))).status).toBe(404);
  expect(
    (
      await route.PUT(
        req(other.id, JSON.stringify({ scope: { kind: "all" }, length: 5 })),
        ctx(allId),
      )
    ).status,
  ).toBe(404);
  for (const scope of [
    { kind: "deck", deckId: theirs.id },
    { kind: "topics", deckId: theirs.id, topics: ["Topic"] },
  ]) {
    const res = await route.PUT(req(me.id, JSON.stringify({ scope, length: 5 })), ctx(sid()));
    expect(res.status).toBe(404);
  }
  expect((await route.PUT(req(me.id), ctx(sid()))).status).toBe(404);

  // Malformed input.
  expect((await route.PUT(req(me.id, "{"), ctx(sid()))).status).toBe(400);
  expect(
    (await route.PUT(req(me.id, JSON.stringify({ scope: { kind: "all" }, length: 7 })), ctx(sid())))
      .status,
  ).toBe(400);
  expect(
    (
      await route.PUT(
        req(me.id, JSON.stringify({ scope: { kind: "all" }, length: 5 })),
        ctx("nope"),
      )
    ).status,
  ).toBe(400);
  expect((await route.PUT(new Request("http://x/", { method: "PUT" }), ctx(sid()))).status).toBe(
    401,
  );

  // No candidates: an empty queue is still a session.
  const empty = await put(sid(), { scope: { kind: "all" }, length: 5 }, other);
  expect(ids(empty)).toEqual([foreignCard.id]);
  const nothing = await put(sid(), { scope: { kind: "weak" }, length: "all" }, other);
  expect(nothing.queue).toEqual([]);
  expect(nothing.session.plannedCount).toBe(0);
});

test("AC7: with 16 New cards and a cap of 10, the allowance is the cap minus today's live introductions", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_sessions_cap");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { putSession } = await import("@/server/sessions");

  const me = await f.createProfile(db, { name: "Me", settings: { newCardsPerDay: 10 } });
  const deck = await f.createDeck(db, me.id);
  const fresh = [];
  for (let i = 0; i < 16; i++) fresh.push(await f.createCard(db, deck.id));
  const start = (now: Date) =>
    putSession(
      me,
      crypto.randomUUID(),
      { scope: { kind: "all" }, length: "all" },
      now,
      db,
      () => 0,
    );

  const morning = new Date("2026-02-02T08:00:00Z");
  expect((await start(morning)).queue.map((c) => c.cardId)).toEqual(
    fresh.slice(0, 10).map((c) => c.id),
  );

  // Today (after the 07:00 start): 6 introduced, plus one undone, which does not count.
  for (const c of fresh.slice(0, 6)) {
    await f.createCardState(db, me.id, c.id, { box: 2, dueDate: "2026-02-03" });
    await f.createReviewLog(db, me.id, c.id, {
      introducedNew: true,
      reviewedAt: new Date("2026-02-02T08:30:00Z"),
    });
  }
  await f.createReviewLog(db, me.id, fresh[6]!.id, {
    introducedNew: true,
    reviewedAt: new Date("2026-02-02T08:31:00Z"),
    undoneAt: new Date(),
  });
  // Before today's 07:00 start: yesterday's learning day, so it does not count either.
  await f.createReviewLog(db, me.id, fresh[7]!.id, {
    introducedNew: true,
    reviewedAt: new Date("2026-02-02T06:30:00Z"),
  });

  const later = await start(new Date("2026-02-02T09:00:00Z"));
  expect(later.queue.map((c) => c.cardId)).toEqual(fresh.slice(6, 10).map((c) => c.id));
  // Over one local day no more than 10 New cards: 6 introduced plus 4 offered.

  // Next learning day the cap is whole again: the 6 graded cards are due, then 10 New.
  const tomorrow = (await start(new Date("2026-02-03T07:00:00Z"))).queue.map((c) => c.cardId);
  expect(new Set(tomorrow.slice(0, 6))).toEqual(new Set(fresh.slice(0, 6).map((c) => c.id)));
  expect(tomorrow.slice(6)).toEqual(fresh.slice(6, 16).map((c) => c.id));
});

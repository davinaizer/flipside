import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, images, reviewLog, sessions } from "@/server/db/schema";
import { stateColumns, toSchedulerState } from "@/server/card-state";
import { findDeck, newCardsRemaining } from "@/server/decks";
import { ApiError } from "@/server/http/errors";
import type { Profile } from "@/server/profile";
import { learningDay } from "@/domain/day";
import { gradeLabels } from "@/domain/grade-labels";
import { buildSession, type SessionScope } from "@/domain/session-builder";
import type { AnswerStyle, Grade } from "@/shared/enums";
import {
  sessionRequestSchema,
  type SessionCardPayload,
  type SessionRequest,
  type SessionEndResponse,
  type SessionResponse,
  type SessionSummary,
} from "@/shared/schemas/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What sessions.meta holds (no schema change): the length asked for and the ordered card
 * ids built at creation, so a retry or a resume returns the identical queue.
 */
export const sessionMetaSchema = z.object({
  length: sessionRequestSchema.shape.length,
  cardIds: z.array(z.string()),
});

type SessionRow = typeof sessions.$inferSelect;

const notFound = () => new ApiError(404, "session_not_found", "That session does not exist.");

/**
 * Which of the session's cards are still live for the profile: not deleted, in a deck the
 * profile owns that is not deleted. Needs cards joined to decks. The session shows only
 * these, and grading replays the queue over the same set, so a card deleted mid-session
 * drops out on both sides.
 */
function liveSessionCards(profileId: string, cardIds: string[]) {
  return and(inArray(cards.id, cardIds), eq(decks.ownerProfileId, profileId), isNull(decks.deletedAt), isNull(cards.deletedAt));
}

/** The session's live card ids, in stored order: the card list its queue is replayed over. */
export async function liveSessionCardIds(db: Pick<Db, "select">, profileId: string, cardIds: string[]): Promise<string[]> {
  if (cardIds.length === 0) return [];
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(liveSessionCards(profileId, cardIds));
  const live = new Set(rows.map((r) => r.id));
  return cardIds.filter((id) => live.has(id));
}

/** The API scope as the domain builder takes it; deck and topic scopes must name an owned deck (404 otherwise). */
async function toDomainScope(profile: Profile, scope: SessionRequest["scope"], db: Db): Promise<SessionScope> {
  switch (scope.kind) {
    case "all":
    case "weak":
    case "cards": // buildQueue only reads the profile's own cards, so foreign ids simply drop out
      return scope;
    case "deck":
      return { kind: "deck", deckId: (await findDeck(profile.id, scope.deckId, db)).id };
    case "topics": {
      const deckId = (await findDeck(profile.id, scope.deckId, db)).id;
      return {
        kind: "topics",
        topics: scope.topics.map((topic) => ({ deckId, topic })),
        ignoreDue: scope.ignoreDue,
      };
    }
  }
}

/** Builds the ordered card ids for a new session over the profile's live decks and cards. */
async function buildQueue(profile: Profile, request: SessionRequest, now: Date, db: Db, random: () => number) {
  const today = learningDay(now, profile.timezone, profile.dayStartHour);
  const scope = await toDomainScope(profile, request.scope, db);
  const [newRemaining, rows] = await Promise.all([
    newCardsRemaining(profile, today, db),
    db
      .select({ id: cards.id, deckId: cards.deckId, topic: cards.topic, ...stateColumns })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .leftJoin(cardState, and(eq(cardState.cardId, cards.id), eq(cardState.profileId, profile.id)))
      .where(and(eq(decks.ownerProfileId, profile.id), isNull(decks.deletedAt), isNull(cards.deletedAt)))
      // New cards keep this order (oldest deck first, then deck position).
      .orderBy(asc(decks.createdAt), asc(decks.id), asc(cards.position), asc(cards.id)),
  ]);
  return buildSession({
    cards: rows.map((r) => ({ id: r.id, deckId: r.deckId, topic: r.topic, state: toSchedulerState(r) })),
    scope,
    length: request.length,
    today,
    newRemaining,
    random,
  }).cardIds;
}

/** The response for a stored session: its queue with fresh text, images and labels, and the grades so far. */
async function loadSession(profile: Profile, row: SessionRow, now: Date, db: Db): Promise<SessionResponse> {
  const meta = sessionMetaSchema.parse(row.meta);
  const today = learningDay(now, profile.timezone, profile.dayStartHour);

  const cardRows =
    meta.cardIds.length === 0
      ? []
      : await db
          .select({
            id: cards.id,
            deckId: cards.deckId,
            deckName: decks.name,
            answerStyle: decks.answerStyle,
            topic: cards.topic,
            front: cards.front,
            back: cards.back,
            frontImageId: cards.frontImageId,
            backImageId: cards.backImageId,
            ...stateColumns,
          })
          .from(cards)
          .innerJoin(decks, eq(decks.id, cards.deckId))
          .leftJoin(cardState, and(eq(cardState.cardId, cards.id), eq(cardState.profileId, profile.id)))
          .where(liveSessionCards(profile.id, meta.cardIds));

  const imageIds = cardRows.flatMap((c) => [c.frontImageId, c.backImageId]).filter((i): i is string => i !== null);
  const imageRows =
    imageIds.length === 0
      ? []
      : await db
          .select({ id: images.id, width: images.width, height: images.height })
          .from(images)
          .where(and(inArray(images.id, imageIds), eq(images.ownerProfileId, profile.id)));
  const imageById = new Map(imageRows.map((i) => [i.id, { ...i, url: `/api/v1/images/${i.id}` }]));
  const image = (id: string | null) => (id === null ? null : (imageById.get(id) ?? null));

  const byId = new Map(cardRows.map((c) => [c.id, c]));
  // Stored order; a card deleted since the session began drops out of the queue.
  const queue: SessionCardPayload[] = meta.cardIds.flatMap((id) => {
    const c = byId.get(id);
    if (!c) return [];
    return [
      {
        cardId: c.id,
        deckId: c.deckId,
        deckName: c.deckName,
        answerStyle: c.answerStyle as AnswerStyle,
        topic: c.topic,
        front: c.front,
        back: c.back,
        frontImage: image(c.frontImageId),
        backImage: image(c.backImageId),
        labels: gradeLabels(toSchedulerState(c), today),
      },
    ];
  });

  const grades = await db
    .select({ reviewId: reviewLog.id, cardId: reviewLog.cardId, grade: reviewLog.grade, reviewedAt: reviewLog.reviewedAt })
    .from(reviewLog)
    .where(and(eq(reviewLog.sessionId, row.id), eq(reviewLog.profileId, profile.id), isNull(reviewLog.undoneAt)))
    // The order grading replays them in (reviews.ts), so client and server build the same queue.
    .orderBy(asc(reviewLog.reviewedAt), asc(reviewLog.createdAt));

  return {
    session: {
      id: row.id,
      scope: row.scope as SessionRequest["scope"],
      length: meta.length,
      plannedCount: row.plannedCount,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      endedReason: row.endedReason as SessionResponse["session"]["endedReason"],
    },
    queue,
    grades: grades.map((g) => ({ ...g, grade: g.grade as Grade, reviewedAt: g.reviewedAt.toISOString() })),
  };
}

async function findSessionRow(id: string, db: Db): Promise<SessionRow | undefined> {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
  return row;
}

/**
 * PUT /sessions/{id} (R1, N2). The client picks the id, so the call is idempotent: if the
 * session exists it is returned as stored (a retry gets the identical queue whatever the
 * body), and a `null` body only resumes. Otherwise the body's scope and length build a
 * new queue, stored in sessions.meta. Another profile's session or deck is a 404.
 */
export async function putSession(
  profile: Profile,
  id: string,
  body: unknown,
  now: Date = new Date(),
  db: Db = getDb(),
  random: () => number = Math.random,
): Promise<SessionResponse> {
  if (!UUID.test(id)) throw new ApiError(400, "invalid_id", "The session id must be a UUID.");
  const sessionId = id.toLowerCase();

  const existing = await findSessionRow(sessionId, db);
  if (existing) {
    if (existing.profileId !== profile.id) throw notFound();
    return loadSession(profile, existing, now, db);
  }
  if (body === null) throw notFound();

  const parsed = sessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "invalid_request",
      "The session request is not valid.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const cardIds = await buildQueue(profile, parsed.data, now, db, random);
  // A concurrent retry may insert first; then both read back the one stored row.
  await db
    .insert(sessions)
    .values({
      id: sessionId,
      profileId: profile.id,
      scope: parsed.data.scope,
      plannedCount: cardIds.length,
      startedAt: now,
      meta: { length: parsed.data.length, cardIds },
    })
    .onConflictDoNothing();
  const row = await findSessionRow(sessionId, db);
  if (!row || row.profileId !== profile.id) throw notFound();
  return loadSession(profile, row, now, db);
}

/** Loads a session of this profile or throws 404 (another profile's session looks missing). */
async function ownSession(profile: Profile, id: string, db: Db): Promise<SessionRow> {
  if (!UUID.test(id)) throw notFound();
  const row = await findSessionRow(id.toLowerCase(), db);
  if (!row || row.profileId !== profile.id) throw notFound();
  return row;
}

/**
 * POST /sessions/{id}/end (R7). Marks the session ended early; grades already given stay.
 * An already ended session (early or completed) is returned as stored, so a retry is safe.
 */
export async function endSession(profile: Profile, id: string, now: Date = new Date(), db: Db = getDb()): Promise<SessionEndResponse> {
  const row = await ownSession(profile, id, db);
  let ended = row;
  if (!row.endedAt) {
    // The guard on ended_at keeps a concurrent completion or end from being overwritten.
    const [updated] = await db
      .update(sessions)
      .set({ endedAt: now, endedReason: "ended_early" })
      .where(and(eq(sessions.id, row.id), isNull(sessions.endedAt)))
      .returning();
    ended = updated ?? (await findSessionRow(row.id, db))!;
  }
  return {
    session: { id: ended.id, endedAt: ended.endedAt!.toISOString(), endedReason: ended.endedReason as SessionEndResponse["session"]["endedReason"] },
  };
}

/**
 * GET /sessions/{id}/summary (R11). ASSUMED: each card counts once, by its first live
 * (non-undone) grade in the session; re-queued attempts do not change the counts. Session
 * time runs from start to the end, or to the last grade while the session is still open.
 */
export async function getSummary(profile: Profile, id: string, db: Db = getDb()): Promise<SessionSummary> {
  const row = await ownSession(profile, id, db);
  const meta = sessionMetaSchema.parse(row.meta);
  const reviews = await db
    .select({ cardId: reviewLog.cardId, grade: reviewLog.grade, reviewedAt: reviewLog.reviewedAt })
    .from(reviewLog)
    .where(and(eq(reviewLog.sessionId, row.id), eq(reviewLog.profileId, profile.id), isNull(reviewLog.undoneAt)))
    .orderBy(asc(reviewLog.reviewedAt), asc(reviewLog.createdAt));

  const first = new Map<string, Grade>();
  for (const r of reviews) if (!first.has(r.cardId)) first.set(r.cardId, r.grade as Grade);
  const counts = { not_yet: 0, nearly: 0, got_it: 0 };
  for (const g of first.values()) counts[g]++;

  // Queue order, so the cards to go again appear as they were met.
  const missIds = meta.cardIds.filter((c) => first.get(c) === "not_yet");
  const goAgainIds = missIds.slice(0, 3);
  const goAgainRows =
    goAgainIds.length === 0
      ? []
      : await db
          .select({ id: cards.id, deckName: decks.name, topic: cards.topic, front: cards.front })
          .from(cards)
          .innerJoin(decks, eq(decks.id, cards.deckId))
          .where(and(inArray(cards.id, goAgainIds), eq(decks.ownerProfileId, profile.id)));
  const byId = new Map(goAgainRows.map((c) => [c.id, c]));

  const end = row.endedAt ?? reviews.at(-1)?.reviewedAt ?? row.startedAt;
  return {
    session: {
      id: row.id,
      scope: row.scope as SessionRequest["scope"],
      length: meta.length,
      plannedCount: row.plannedCount,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      endedReason: row.endedReason as SessionResponse["session"]["endedReason"],
    },
    counts,
    gradedCount: first.size,
    durationMs: Math.max(0, end.getTime() - row.startedAt.getTime()),
    goAgain: goAgainIds.flatMap((cardId) => {
      const c = byId.get(cardId);
      return c ? [{ cardId, deckName: c.deckName, topic: c.topic, front: c.front }] : [];
    }),
    missIds,
  };
}

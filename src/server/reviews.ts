import { z } from "zod";
import { and, asc, desc, eq, gt, gte, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, reviewLog, sessions } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import type { Profile } from "@/server/profile";
import { liveSessionCardIds, sessionMetaSchema } from "@/server/sessions";
import { dayStartUtc, learningDay } from "@/domain/day";
import { gradeLabels } from "@/domain/grade-labels";
import { applyGrade, type Box, type SchedulerState } from "@/domain/scheduler";
import { currentEntry, gradeCurrent, hasAttemptLeft, isFinished, replayQueue, wouldRequeue } from "@/domain/session-queue";
import type { CardStatus, Grade } from "@/shared/enums";
import {
  reviewRequestSchema,
  reviewStateSchema,
  type ReviewResponse,
  type UndoResponse,
} from "@/shared/schemas/review";

type ReviewRow = typeof reviewLog.$inferSelect;

/**
 * review_log.prev_state: the whole card_state row before the grade, so undo (F6.3) can
 * restore it exactly; null means the card was New (no row), and undo removes the row.
 */
export const prevStateSchema = reviewStateSchema.extend({ lastReviewedAt: z.string().nullable() }).nullable();
export type PrevState = z.infer<typeof prevStateSchema>;

/** review_log.meta for a review: the result returned, so a retry answers identically. */
const reviewMetaSchema = z.object({ state: reviewStateSchema, requeue: z.boolean() });

const notFound = (what: "review" | "session" | "card") =>
  new ApiError(404, `${what}_not_found`, `That ${what} does not exist.`);

/** The response for a stored review; labels use the learning day it was graded on. */
function toResponse(profile: Profile, row: ReviewRow): ReviewResponse {
  const { state, requeue } = reviewMetaSchema.parse(row.meta);
  const today = learningDay(row.reviewedAt, profile.timezone, profile.dayStartHour);
  return {
    review: {
      id: row.id,
      sessionId: row.sessionId!,
      cardId: row.cardId,
      grade: row.grade as Grade,
      reviewedAt: row.reviewedAt.toISOString(),
    },
    state,
    requeue,
    labels: requeue ? gradeLabels(state as SchedulerState, today) : null,
  };
}

/**
 * PUT /reviews/{id} (R4, R5, R12, N2). Records one grade in one transaction: checks the
 * session and card belong to the profile and that the card is the current card of the
 * session's replayed queue (domain/session-queue), applies the scheduler, writes card_state and an append-only review_log
 * row. The client picks the id, so a retry returns the stored result and changes nothing.
 */
export async function putReview(
  profile: Profile,
  id: string,
  body: unknown,
  now: Date = new Date(),
  db: Db = getDb(),
): Promise<ReviewResponse> {
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "invalid_id", "The review id must be a UUID.");
  const reviewId = id.toLowerCase();
  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "invalid_request",
      "The review is not valid.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const { sessionId, cardId, grade, durationMs } = parsed.data;

  return db.transaction(async (tx) => {
    // Locking the session serialises grades within it, including concurrent retries of one id.
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).for("update");

    const [existing] = await tx.select().from(reviewLog).where(eq(reviewLog.id, reviewId));
    if (existing) {
      if (existing.profileId !== profile.id) throw notFound("review");
      return toResponse(profile, existing);
    }

    if (!session || session.profileId !== profile.id) throw notFound("session");
    const meta = sessionMetaSchema.parse(session.meta);
    if (!meta.cardIds.includes(cardId)) {
      throw new ApiError(409, "card_not_in_session", "That card is not in this session.");
    }

    // Section 10: the card's deck must belong to the profile whose card_state is written.
    const [card] = await tx
      .select({ owner: decks.ownerProfileId })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .where(and(eq(cards.id, cardId), isNull(cards.deletedAt), isNull(decks.deletedAt)))
      .for("update", { of: cards });
    if (!card || card.owner !== profile.id) throw notFound("card");

    // Replay the queue the client sees, over the cards still live, and accept only its current card.
    const liveIds = await liveSessionCardIds(tx, profile.id, meta.cardIds);
    const given = await tx
      .select({ cardId: reviewLog.cardId, grade: reviewLog.grade })
      .from(reviewLog)
      .where(and(eq(reviewLog.sessionId, sessionId), isNull(reviewLog.undoneAt)))
      .orderBy(asc(reviewLog.reviewedAt), asc(reviewLog.createdAt));
    const { queue } = replayQueue(liveIds, given.map((g) => ({ cardId: g.cardId, grade: g.grade as Grade })));
    if (currentEntry(queue)?.cardId !== cardId) {
      throw hasAttemptLeft(queue, cardId)
        ? new ApiError(409, "not_current_card", "That card is not the current card in this session.")
        : new ApiError(409, "no_attempt_left", "That card has no attempt left in this session.");
    }

    const today = learningDay(now, profile.timezone, profile.dayStartHour);
    const [prevRow] = await tx
      .select()
      .from(cardState)
      .where(and(eq(cardState.profileId, profile.id), eq(cardState.cardId, cardId)));
    const prevState: PrevState = prevRow
      ? {
          box: prevRow.box,
          dueDate: prevRow.dueDate,
          reps: prevRow.reps,
          lapses: prevRow.lapses,
          lastGrade: prevRow.lastGrade as Grade | null,
          status: prevRow.status as CardStatus,
          lastReviewedAt: prevRow.lastReviewedAt?.toISOString() ?? null,
        }
      : null;
    const before: SchedulerState | null = prevState && { ...prevState, box: prevState.box as Box };
    const { state } = applyGrade(before, grade, today);
    const requeue = grade === "not_yet" && wouldRequeue(queue);

    // Section 7: the first live review of this card on this learning day, in any session.
    const [earlierToday] = await tx
      .select({ id: reviewLog.id })
      .from(reviewLog)
      .where(
        and(
          eq(reviewLog.profileId, profile.id),
          eq(reviewLog.cardId, cardId),
          isNull(reviewLog.undoneAt),
          gte(reviewLog.reviewedAt, dayStartUtc(today, profile.timezone, profile.dayStartHour)),
        ),
      )
      .limit(1);

    const stateValues = { ...state, lastReviewedAt: now, updatedAt: now };
    await tx
      .insert(cardState)
      .values({ profileId: profile.id, cardId, ...stateValues })
      .onConflictDoUpdate({ target: [cardState.profileId, cardState.cardId], set: stateValues });

    const [row] = await tx
      .insert(reviewLog)
      .values({
        id: reviewId,
        profileId: profile.id,
        cardId,
        sessionId,
        grade,
        durationMs,
        reviewedAt: now,
        isFirstAttemptToday: !earlierToday,
        // A card counts toward the daily new-card cap the first time it is ever graded.
        introducedNew: prevState === null,
        boxBefore: prevState?.box ?? null,
        boxAfter: state.box,
        dueAfter: state.dueDate,
        prevState,
        meta: { state, requeue },
      })
      .returning();
    // R7: the session is completed by the grade that finishes its queue. An ended session keeps
    // its first end, and undoing a grade later does not reopen a completed session.
    if (!session.endedAt && isFinished(gradeCurrent(queue, grade))) {
      await tx.update(sessions).set({ endedAt: now, endedReason: "completed" }).where(eq(sessions.id, sessionId));
    }
    return toResponse(profile, row!);
  });
}

/** The response for an undone review: the restored state and labels for regrading it, from the day of the undo. */
function toUndoResponse(profile: Profile, row: ReviewRow): UndoResponse {
  const prev = prevStateSchema.parse(row.prevState);
  const state = prev && { box: prev.box, dueDate: prev.dueDate, reps: prev.reps, lapses: prev.lapses, lastGrade: prev.lastGrade, status: prev.status };
  const today = learningDay(row.undoneAt!, profile.timezone, profile.dayStartHour);
  return {
    review: {
      id: row.id,
      sessionId: row.sessionId!,
      cardId: row.cardId,
      grade: row.grade as Grade,
      reviewedAt: row.reviewedAt.toISOString(),
      undoneAt: row.undoneAt!.toISOString(),
    },
    state,
    labels: gradeLabels(state && { ...state, box: state.box as Box }, today),
  };
}

/**
 * DELETE /reviews/{id} (R6, AC6). Undo: restores card_state from prev_state (removing the
 * row when the card was New) and marks the review undone; the row stays (append-only).
 * Statistics, the new-card allowance and the first-attempt check all skip undone rows, so
 * they recover with no further write. Only the latest live review of its session can be
 * undone, which lets undo step back through the whole session one grade at a time. A
 * repeat answers the stored result.
 */
export async function undoReview(profile: Profile, id: string, now: Date = new Date(), db: Db = getDb()): Promise<UndoResponse> {
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "invalid_id", "The review id must be a UUID.");
  const reviewId = id.toLowerCase();

  return db.transaction(async (tx) => {
    const [found] = await tx.select({ profileId: reviewLog.profileId, sessionId: reviewLog.sessionId }).from(reviewLog).where(eq(reviewLog.id, reviewId));
    if (!found || found.profileId !== profile.id) throw notFound("review");
    // Same lock as putReview, so an undo and a grade in one session never interleave.
    if (found.sessionId) await tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, found.sessionId)).for("update");

    const [row] = await tx.select().from(reviewLog).where(eq(reviewLog.id, reviewId));
    if (row!.undoneAt) return toUndoResponse(profile, row!);

    const notLatest = () => new ApiError(409, "not_latest_review", "Only the latest grade in a session can be undone.");
    const [latest] = await tx
      .select({ id: reviewLog.id })
      .from(reviewLog)
      .where(and(eq(reviewLog.sessionId, row!.sessionId!), isNull(reviewLog.undoneAt)))
      .orderBy(desc(reviewLog.reviewedAt), desc(reviewLog.createdAt))
      .limit(1);
    if (latest?.id !== reviewId) throw notLatest();
    // A later grade of the same card in another session built on this one; restoring the
    // older state would silently discard it.
    // Lock the card row as putReview does, so a concurrent grade of it elsewhere cannot slip past this check.
    await tx.select({ id: cards.id }).from(cards).where(eq(cards.id, row!.cardId)).for("update");
    const [laterElsewhere] = await tx
      .select({ id: reviewLog.id })
      .from(reviewLog)
      .where(
        and(
          eq(reviewLog.profileId, profile.id),
          eq(reviewLog.cardId, row!.cardId),
          isNull(reviewLog.undoneAt),
          gt(reviewLog.reviewedAt, row!.reviewedAt),
        ),
      )
      .limit(1);
    if (laterElsewhere) throw notLatest();

    const prev = prevStateSchema.parse(row!.prevState);
    const key = and(eq(cardState.profileId, profile.id), eq(cardState.cardId, row!.cardId));
    if (prev === null) {
      await tx.delete(cardState).where(key);
    } else {
      const restored = {
        box: prev.box,
        dueDate: prev.dueDate,
        reps: prev.reps,
        lapses: prev.lapses,
        lastGrade: prev.lastGrade,
        status: prev.status,
        lastReviewedAt: prev.lastReviewedAt ? new Date(prev.lastReviewedAt) : null,
        updatedAt: now,
      };
      await tx
        .insert(cardState)
        .values({ profileId: profile.id, cardId: row!.cardId, ...restored })
        .onConflictDoUpdate({ target: [cardState.profileId, cardState.cardId], set: restored });
    }

    const [undone] = await tx.update(reviewLog).set({ undoneAt: now, updatedAt: now }).where(eq(reviewLog.id, reviewId)).returning();
    return toUndoResponse(profile, undone!);
  });
}

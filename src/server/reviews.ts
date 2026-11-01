import { z } from "zod";
import { and, eq, gte, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, reviewLog, sessions } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import type { Profile } from "@/server/profile";
import { sessionMetaSchema } from "@/server/sessions";
import { dayStartUtc, learningDay } from "@/domain/day";
import { gradeLabels } from "@/domain/grade-labels";
import { applyGrade, type Box, type SchedulerState } from "@/domain/scheduler";
import { REQUEUE_MAX_PER_SESSION } from "@/shared/constants";
import type { CardStatus, Grade } from "@/shared/enums";
import {
  reviewRequestSchema,
  reviewStateSchema,
  type ReviewResponse,
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
 * session and card belong to the profile and that the card has an attempt left in the
 * session's queue, applies the scheduler, writes card_state and an append-only review_log
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
    if (!sessionMetaSchema.parse(session.meta).cardIds.includes(cardId)) {
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

    // One attempt per queue entry: the first, plus one per Not yet that re-queued (at most two).
    const inSession = await tx
      .select({ grade: reviewLog.grade })
      .from(reviewLog)
      .where(and(eq(reviewLog.sessionId, sessionId), eq(reviewLog.cardId, cardId), isNull(reviewLog.undoneAt)));
    const notYets = inSession.filter((r) => r.grade === "not_yet").length;
    if (inSession.length >= 1 + Math.min(notYets, REQUEUE_MAX_PER_SESSION)) {
      throw new ApiError(409, "no_attempt_left", "That card has no attempt left in this session.");
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
    const requeue = grade === "not_yet" && notYets < REQUEUE_MAX_PER_SESSION;

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
    return toResponse(profile, row!);
  });
}

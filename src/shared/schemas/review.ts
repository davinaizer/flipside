import { z } from "zod";
import { CARD_STATUSES, GRADES, type Grade } from "../enums";

/** Body of PUT /reviews/{id}; the review id is client-made (N2), so a retry is safe. */
export const reviewRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    cardId: z.string().uuid(),
    grade: z.enum(GRADES),
    /** Front shown to grade, in milliseconds; statistics cap it when they read it. */
    durationMs: z.number().int().min(0).max(2_147_483_647),
  })
  .strict();

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

/** The card's state after the grade, as stored in card_state. dueDate is the next due date. */
export const reviewStateSchema = z.object({
  box: z.number().int().min(1).max(5),
  dueDate: z.string(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  lastGrade: z.enum(GRADES).nullable(),
  status: z.enum(CARD_STATUSES),
});

const gradeLabelsSchema = z.object({ not_yet: z.string(), nearly: z.string(), got_it: z.string() }) satisfies z.ZodType<Record<Grade, string>>;

/** Response of PUT /reviews/{id}, identical on a retry. */
export const reviewResponseSchema = z.object({
  review: z.object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    cardId: z.string().uuid(),
    grade: z.enum(GRADES),
    reviewedAt: z.string(),
  }),
  state: reviewStateSchema,
  /** Whether the card comes back later in this session (Not yet, at most twice per card). */
  requeue: z.boolean(),
  /** Labels for the re-queued attempt, from the new state; null when the card does not come back. */
  labels: gradeLabelsSchema.nullable(),
});

/** Response of DELETE /reviews/{id} (undo), identical on a repeat. */
export const undoResponseSchema = z.object({
  review: reviewResponseSchema.shape.review.extend({ undoneAt: z.string() }),
  /** The card's state restored by the undo; null when the card is New again. */
  state: reviewStateSchema.nullable(),
  /** Labels for regrading the card from the restored state. */
  labels: gradeLabelsSchema,
});

export type ReviewState = z.infer<typeof reviewStateSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type UndoResponse = z.infer<typeof undoResponseSchema>;

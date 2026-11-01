import { z } from "zod";
import { ANSWER_STYLES, ENDED_REASONS, GRADES, type Grade } from "../enums";

/** Body of PUT /sessions/{id}. Scopes mirror domain/session-builder; the Library uses all and weak, the Deck page deck and topics. */
export const sessionScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("weak") }),
  z.object({ kind: z.literal("deck"), deckId: z.string().uuid() }),
  /** Topics of one deck; ignoreDue is "practise anyway" (D3). */
  z.object({
    kind: z.literal("topics"),
    deckId: z.string().uuid(),
    topics: z.array(z.string().min(1)).min(1),
    ignoreDue: z.boolean().optional(),
  }),
]);
export const sessionRequestSchema = z.object({
  scope: sessionScopeSchema,
  length: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal("all")]),
});

export type SessionRequest = z.infer<typeof sessionRequestSchema>;

const gradeLabelsSchema = z.object({ not_yet: z.string(), nearly: z.string(), got_it: z.string() }) satisfies z.ZodType<Record<Grade, string>>;

const cardImageSchema = z.object({
  id: z.string().uuid(),
  /** GET /api/v1/images/{id}; only the owner can read it. */
  url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});

/** One card of the queue, with everything the practice screen needs offline (section 11). */
export const sessionCardSchema = z.object({
  cardId: z.string().uuid(),
  deckId: z.string().uuid(),
  deckName: z.string(),
  answerStyle: z.enum(ANSWER_STYLES),
  topic: z.string(),
  front: z.string(),
  back: z.string(),
  frontImage: cardImageSchema.nullable(),
  backImage: cardImageSchema.nullable(),
  /** The due date each grade would give, from the same scheduler that applies it. */
  labels: gradeLabelsSchema,
});

/** A non-undone grade already given in this session, oldest first, so a client can resume. */
export const sessionGradeSchema = z.object({
  reviewId: z.string().uuid(),
  cardId: z.string().uuid(),
  grade: z.enum(GRADES),
  reviewedAt: z.string(),
});

/** Response of PUT /sessions/{id}, for a new session and for a resume. */
export const sessionResponseSchema = z.object({
  session: z.object({
    id: z.string().uuid(),
    scope: sessionScopeSchema,
    length: sessionRequestSchema.shape.length,
    plannedCount: z.number().int().nonnegative(),
    startedAt: z.string(),
    endedAt: z.string().nullable(),
    endedReason: z.enum(ENDED_REASONS).nullable(),
  }),
  /** Cards in the order first built; re-queued attempts are added by the client queue. */
  queue: z.array(sessionCardSchema),
  grades: z.array(sessionGradeSchema),
});

export type SessionCardPayload = z.infer<typeof sessionCardSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** Response of POST /sessions/{id}/end. */
export const sessionEndResponseSchema = z.object({
  session: z.object({
    id: z.string().uuid(),
    endedAt: z.string(),
    endedReason: z.enum(ENDED_REASONS),
  }),
});
export type SessionEndResponse = z.infer<typeof sessionEndResponseSchema>;

/**
 * Response of GET /sessions/{id}/summary. Counts use each card's first live grade in the
 * session. goAgain is up to three Not yet cards; missIds is every Not yet card, for
 * "Practise the misses" (a new session with scope {kind:"cards"} is not built yet).
 */
export const sessionSummarySchema = z.object({
  session: sessionResponseSchema.shape.session,
  counts: z.object({ not_yet: z.number().int(), nearly: z.number().int(), got_it: z.number().int() }),
  gradedCount: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  goAgain: z.array(z.object({ cardId: z.string().uuid(), deckName: z.string(), topic: z.string(), front: z.string() })).max(3),
  missIds: z.array(z.string().uuid()),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

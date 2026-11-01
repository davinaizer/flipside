import { z } from "zod";

const count = z.number().int().nonnegative();
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** 0 to 1; null when there is nothing to divide by. */
const share = z.number().min(0).max(1).nullable();

/** `?range=` of GET /stats; missing means this week. */
export const statsRangeSchema = z.enum(["week", "month"]).default("week");

const windowSchema = z.object({ start: localDate, end: localDate, days: count });

const metricsSchema = z.object({
  cardsReviewed: count,
  gotItRate: share,
  /** Median capped duration in seconds over every attempt (section 7). */
  medianSeconds: z.number().nonnegative().nullable(),
  daysPractised: count,
  daysInWindow: count,
});

/** Plain-word change against the previous equal period; null when either side has no data. */
const change = z.string().nullable();

export const statsSchema = z.object({
  range: z.enum(["week", "month"]),
  /** The profile's current learning day. */
  today: localDate,
  /** False until the profile has any live review: the Progress empty state (S5). */
  hasReviews: z.boolean(),
  windows: z.object({ current: windowSchema, previous: windowSchema }),
  current: metricsSchema,
  previous: metricsSchema,
  changes: z.object({
    cardsReviewed: change,
    gotItRate: change,
    timePerCard: change,
    daysPractised: change,
  }),
  /** Per day (week) or per Monday-aligned week (month); `current` marks today's period (S2). */
  bars: z.array(z.object({ start: localDate, cardsReviewed: count, current: z.boolean() })),
  /** Lowest-mastery topics with at least three cards, live decks only (S3). */
  focusNext: z.array(
    z.object({
      deckId: z.string().uuid(),
      deckName: z.string(),
      topic: z.string(),
      cards: count,
      mastery: z.number().min(0).max(1),
      lapses: count,
    }),
  ),
  /** Live decks, lowest mastery first, decks without cards last (S4). */
  byDeck: z.array(
    z.object({
      deckId: z.string().uuid(),
      name: z.string(),
      color: z.string().nullable(),
      cards: count,
      /** Cards in boxes 4 and 5 (the Mastered column). */
      mastered: count,
      mastery: share,
      /** Median capped seconds per attempt in the current window. */
      medianSeconds: z.number().nonnegative().nullable(),
      /** ISO instant of the deck's latest live review, any time. */
      lastPractisedAt: z.string().nullable(),
    }),
  ),
});

export type StatsRangeParam = z.infer<typeof statsRangeSchema>;
export type Stats = z.infer<typeof statsSchema>;

import { z } from "zod";

const count = z.number().int().nonnegative();

export const deckSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  groupName: z.string().nullable(),
  color: z.string().nullable(),
  answerStyle: z.string(),
  topicCount: count,
  /** Topic names, so the library search can match topics (L6). */
  topics: z.array(z.string()),
  cardCount: count,
  dueCount: count,
  /** Mastery bar buckets (section 7); they add up to cardCount. */
  mastery: z.object({ new: count, notYet: count, nearly: count, gotIt: count }),
});

export const libraryGroupSchema = z.object({
  /** "Other" holds the decks without a group. */
  name: z.string(),
  decks: z.array(deckSummarySchema),
});

export const librarySchema = z.object({
  today: z.object({
    dueCount: count,
    /** Cards a session could start with: due plus New up to the daily cap left (section 5). */
    startableCount: count,
    decksWithDue: count,
    /** The profile's cards-per-session setting. */
    sessionLength: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal("all")]),
    weakCount: count,
  }),
  groups: z.array(libraryGroupSchema),
});

export type DeckSummary = z.infer<typeof deckSummarySchema>;
export type Library = z.infer<typeof librarySchema>;

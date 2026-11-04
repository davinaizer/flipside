import { and, asc, eq, gte, isNull, lt, max } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, reviewLog } from "@/server/db/schema";
import type { Profile } from "@/server/profile";
import { addDays, dayStartUtc, learningDay } from "@/domain/day";
import { computeStats, statsWindows, type StatsRange } from "@/domain/stats";
import type { Grade } from "@/shared/enums";
import type { Stats } from "@/shared/schemas/stats";

/**
 * Every Progress figure for one range (PRD section 7, S1 to S4). Loads the profile's own
 * live reviews (undone rows excluded here, as in docs/statistics-queries.md), decks and
 * cards; domain/stats computeStats does all the arithmetic.
 */
export async function getStats(
  profile: Profile,
  range: StatsRange,
  now: Date = new Date(),
  db: Db = getDb(),
): Promise<Stats> {
  const ctx = { timeZone: profile.timezone, dayStartHour: profile.dayStartHour };
  const today = learningDay(now, ctx.timeZone, ctx.dayStartHour);
  const windows = statsWindows(range, today);
  const from = dayStartUtc(windows.previous.start, ctx.timeZone, ctx.dayStartHour);
  const to = dayStartUtc(addDays(windows.current.end, 1), ctx.timeZone, ctx.dayStartHour);

  const [reviewRows, lastRows, deckRows, cardRows] = await Promise.all([
    db
      .select({
        cardId: reviewLog.cardId,
        deckId: cards.deckId,
        reviewedAt: reviewLog.reviewedAt,
        grade: reviewLog.grade,
        durationMs: reviewLog.durationMs,
        isFirstAttemptToday: reviewLog.isFirstAttemptToday,
      })
      .from(reviewLog)
      .innerJoin(cards, eq(cards.id, reviewLog.cardId))
      .where(
        and(
          eq(reviewLog.profileId, profile.id),
          isNull(reviewLog.undoneAt),
          gte(reviewLog.reviewedAt, from),
          lt(reviewLog.reviewedAt, to),
        ),
      ),
    // Latest live review per deck, deleted decks included so it also answers "any reviews yet".
    db
      .select({ deckId: cards.deckId, last: max(reviewLog.reviewedAt) })
      .from(reviewLog)
      .innerJoin(cards, eq(cards.id, reviewLog.cardId))
      .where(and(eq(reviewLog.profileId, profile.id), isNull(reviewLog.undoneAt)))
      .groupBy(cards.deckId),
    db
      .select({ id: decks.id, name: decks.name, color: decks.color })
      .from(decks)
      .where(and(eq(decks.ownerProfileId, profile.id), isNull(decks.deletedAt)))
      .orderBy(asc(decks.name)),
    db
      .select({ deckId: cards.deckId, topic: cards.topic, box: cardState.box, lapses: cardState.lapses })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .leftJoin(cardState, and(eq(cardState.cardId, cards.id), eq(cardState.profileId, profile.id)))
      .where(
        and(eq(decks.ownerProfileId, profile.id), isNull(decks.deletedAt), isNull(cards.deletedAt)),
      ),
  ]);

  return computeStats({
    range,
    today,
    ctx,
    reviews: reviewRows.map((r) => ({
      cardId: r.cardId,
      deckId: r.deckId,
      reviewedAt: r.reviewedAt.toISOString(),
      grade: r.grade as Grade,
      durationMs: r.durationMs,
      isFirstAttemptToday: r.isFirstAttemptToday,
    })),
    lastReviewByDeck: new Map(lastRows.flatMap((r) => (r.last ? [[r.deckId, new Date(r.last).toISOString()] as const] : []))),
    decks: deckRows,
    cards: cardRows.map((c) => ({ deckId: c.deckId, topic: c.topic, box: c.box, lapses: c.lapses ?? 0 })),
  });
}

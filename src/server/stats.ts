import { and, asc, eq, gte, isNull, lt, max } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, reviewLog } from "@/server/db/schema";
import type { Profile } from "@/server/profile";
import { addDays, dayStartUtc, learningDay } from "@/domain/day";
import {
  changeInWords,
  focusNext,
  masteryBuckets,
  practiceBars,
  sortByLowestMastery,
  statsWindows,
  windowMetrics,
  type StatsRange,
  type StatsReview,
} from "@/domain/stats";
import type { Grade } from "@/shared/enums";
import type { Stats } from "@/shared/schemas/stats";

/**
 * Every Progress figure for one range (PRD section 7, S1 to S4). Reviews come from the
 * profile's own review_log, undone rows excluded; reviews of deleted decks still count in
 * the tiles and bars, while Focus next and By deck only list live decks and cards. The
 * arithmetic lives in domain/stats so the definitions have one home.
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

  const reviews: (StatsReview & { deckId: string })[] = reviewRows.map((r) => ({
    cardId: r.cardId,
    deckId: r.deckId,
    reviewedAt: r.reviewedAt.toISOString(),
    grade: r.grade as Grade,
    durationMs: r.durationMs,
    isFirstAttemptToday: r.isFirstAttemptToday,
    undoneAt: null,
  }));
  const current = windowMetrics(reviews, windows.current, ctx);
  const previous = windowMetrics(reviews, windows.previous, ctx);

  const masteryCards = cardRows.map((c) => ({
    deckId: c.deckId,
    topic: c.topic,
    box: c.box,
    lapses: c.lapses ?? 0,
  }));
  const deckName = new Map(deckRows.map((d) => [d.id, d.name]));
  const lastByDeck = new Map(lastRows.map((r) => [r.deckId, r.last]));

  const byDeck = sortByLowestMastery(
    deckRows.map((d) => {
      const m = masteryBuckets(masteryCards.filter((c) => c.deckId === d.id));
      const deckReviews = reviews.filter((r) => r.deckId === d.id);
      const last = lastByDeck.get(d.id);
      return {
        deckId: d.id,
        name: d.name,
        color: d.color,
        cards: m.total,
        mastered: m.gotIt,
        mastery: m.mastery,
        medianSeconds: windowMetrics(deckReviews, windows.current, ctx).medianSeconds,
        lastPractisedAt: last ? new Date(last).toISOString() : null,
      };
    }),
  );

  return {
    range,
    today,
    hasReviews: lastRows.length > 0,
    windows,
    current,
    previous,
    changes: {
      cardsReviewed: changeInWords("cardsReviewed", current, previous, range),
      gotItRate: changeInWords("gotItRate", current, previous, range),
      timePerCard: changeInWords("timePerCard", current, previous, range),
      daysPractised: changeInWords("daysPractised", current, previous, range),
    },
    bars: practiceBars(reviews, range, today, ctx),
    focusNext: focusNext(masteryCards).map((t) => ({ ...t, deckName: deckName.get(t.deckId)! })),
    byDeck,
  };
}

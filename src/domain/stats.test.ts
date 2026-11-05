import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/domain/stats.json";
import type { Grade } from "../shared/enums";
import {
  changeInWords,
  computeStats,
  masteryBuckets,
  statsWindows,
  type StatsInput,
  type StatsMetric,
  type StatsRange,
  type WindowMetrics,
} from "./stats";

const ctx = fixtures.context;
// Every fixture review belongs to deck d1, so d1's By deck median is the overall one.
const reviews = fixtures.reviews.map((r) => ({ ...r, grade: r.grade as Grade, deckId: "d1" }));
const decks = fixtures.decks.map((d) => ({ id: d.id, name: d.name, color: null }));
const LAST = "2026-11-05T09:00:00.000Z";
const input = (range: StatsRange, today: string, over: Partial<StatsInput> = {}): StatsInput => ({
  range,
  today,
  ctx,
  reviews,
  lastReviewByDeck: new Map([["d1", LAST]]),
  decks,
  cards: fixtures.cards,
  ...over,
});
const METRICS: StatsMetric[] = ["cardsReviewed", "gotItRate", "timePerCard", "daysPractised"];
const EMPTY: WindowMetrics = {
  cardsReviewed: 0,
  gotItRate: null,
  medianSeconds: null,
  daysPractised: 0,
  daysInWindow: 7,
};

describe("stats periods fixtures", () => {
  it.each(fixtures.periods)("$name", (p) => {
    const stats = computeStats(input(p.range as StatsRange, p.today));
    expect(stats).toMatchObject({ range: p.range, today: p.today, hasReviews: true });
    expect(stats.windows).toEqual(p.windows);
    expect(stats.current).toEqual(p.current);
    expect(stats.previous).toEqual(p.previous);
    for (const m of METRICS) expect(stats.changes[m]).toBe(p.changes[m as keyof typeof p.changes]);
    expect(stats.bars).toEqual(p.bars);
    // By deck: the current window's median, for the deck the reviews belong to only.
    const median = Object.fromEntries(stats.byDeck.map((d) => [d.deckId, d.medianSeconds]));
    expect(median).toEqual({ d1: p.current.medianSeconds, d2: null, d3: null });
  });

  it("week windows start on Monday whatever the weekday", () => {
    for (const today of ["2026-11-02", "2026-11-05", "2026-11-08"])
      expect(statsWindows("week", today).current.start).toBe("2026-11-02");
    expect(statsWindows("week", "2026-11-09").current.start).toBe("2026-11-09");
  });
});

describe("changeInWords wording", () => {
  it.each(fixtures.wording)("$words", (w) => {
    const current = { ...EMPTY, ...w.current } as WindowMetrics;
    const previous = { ...EMPTY, ...w.previous } as WindowMetrics;
    expect(changeInWords(w.metric as StatsMetric, current, previous, w.range as StatsRange)).toBe(
      w.words,
    );
  });
});

describe("mastery fixtures", () => {
  it.each(fixtures.decks)("buckets for $name", (d) => {
    expect(masteryBuckets(fixtures.cards.filter((c) => c.deckId === d.id))).toEqual(d.buckets);
  });

  const stats = computeStats(input("week", "2026-11-05"));
  const name = new Map(decks.map((d) => [d.id, d.name]));

  it("by deck: lowest mastery first, empty decks last, with buckets and last practised", () => {
    expect(stats.byDeck.map((d) => d.deckId)).toEqual(fixtures.byDeckOrder);
    for (const d of fixtures.decks) {
      expect(stats.byDeck.find((b) => b.deckId === d.id)).toMatchObject({
        name: d.name,
        cards: d.buckets.total,
        mastered: d.buckets.gotIt,
        mastery: d.buckets.mastery,
        lastPractisedAt: d.id === "d1" ? LAST : null,
      });
    }
  });

  it("focus next: lowest mastery, at least three cards, ties to more lapses, with deck names", () => {
    expect(stats.focusNext).toEqual(
      fixtures.focusNext.map((t) => ({ ...t, deckName: name.get(t.deckId) })),
    );
  });

  it("no review ever means hasReviews is false", () => {
    expect(
      computeStats(input("week", "2026-11-05", { reviews: [], lastReviewByDeck: new Map() }))
        .hasReviews,
    ).toBe(false);
  });
});

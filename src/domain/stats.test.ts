import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/domain/stats.json";
import type { Grade } from "../shared/enums";
import {
  changeInWords,
  focusNext,
  masteryBuckets,
  practiceBars,
  sortByLowestMastery,
  statsWindows,
  windowMetrics,
  type StatsMetric,
  type StatsRange,
  type StatsReview,
  type WindowMetrics,
} from "./stats";

const ctx = fixtures.context;
const reviews = fixtures.reviews.map((r) => ({ ...r, grade: r.grade as Grade })) as StatsReview[];
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
    const range = p.range as StatsRange;
    const windows = statsWindows(range, p.today);
    expect(windows).toEqual(p.windows);
    const current = windowMetrics(reviews, windows.current, ctx);
    const previous = windowMetrics(reviews, windows.previous, ctx);
    expect(current).toEqual(p.current);
    expect(previous).toEqual(p.previous);
    for (const m of METRICS)
      expect(changeInWords(m, current, previous, range)).toBe(p.changes[m as keyof typeof p.changes]);
    expect(practiceBars(reviews, range, p.today, ctx)).toEqual(p.bars);
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

  it("by-deck order is lowest mastery first, empty decks last", () => {
    const rows = fixtures.decks.map((d) => ({ id: d.id, name: d.name, mastery: d.buckets.mastery }));
    expect(sortByLowestMastery(rows).map((d) => d.id)).toEqual(fixtures.byDeckOrder);
  });

  it("focus next: lowest mastery, at least three cards, ties to more lapses", () => {
    expect(focusNext(fixtures.cards)).toEqual(fixtures.focusNext);
  });
});

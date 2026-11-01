/**
 * Statistics definitions (PRD section 7, S1, S3, S4; derived values in section 10).
 *
 * Pure: the server loads review rows and card states, these functions compute
 * the figures. Undone rows are ignored everywhere. Counts use only rows flagged
 * `isFirstAttemptToday` (the same filter as the documented SQL query); time per
 * card uses every attempt, each capped at DURATION_CAP_SECONDS. Days are the
 * profile's learning days (timezone and day start hour), weeks start on Monday.
 */
import {
  DURATION_CAP_SECONDS,
  FOCUS_NEXT_COUNT,
  FOCUS_NEXT_MIN_CARDS,
  MASTERED_MIN_BOX,
  STATS_MONTH_WEEKS,
} from "../shared/constants";
import type { Grade } from "../shared/enums";
import { addDays, daysBetween, learningDay, weekStart, type LocalDate } from "./day";

export type StatsRange = "week" | "month";

export interface StatsReview {
  cardId: string;
  /** ISO instant. */
  reviewedAt: string;
  grade: Grade;
  durationMs: number;
  isFirstAttemptToday: boolean;
  undoneAt: string | null;
}

export interface DayWindow {
  /** First learning day, a Monday. */
  start: LocalDate;
  /** Last learning day (inclusive), a Sunday. */
  end: LocalDate;
  days: number;
}

export interface StatsWindows {
  current: DayWindow;
  previous: DayWindow;
}

export interface DayContext {
  timeZone: string;
  dayStartHour: number;
}

export interface WindowMetrics {
  cardsReviewed: number;
  /** 0 to 1, or null when there are no first attempts. */
  gotItRate: number | null;
  /** Median capped duration in seconds, or null when there are no attempts. */
  medianSeconds: number | null;
  daysPractised: number;
  daysInWindow: number;
}

function windowOf(start: LocalDate, days: number): DayWindow {
  return { start, end: addDays(start, days - 1), days };
}

/** This week (Monday to Sunday) or the last four weeks, plus the previous equal period. */
export function statsWindows(range: StatsRange, today: LocalDate): StatsWindows {
  const weeks = range === "week" ? 1 : STATS_MONTH_WEEKS;
  const days = weeks * 7;
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  return { current: windowOf(start, days), previous: windowOf(addDays(start, -days), days) };
}

interface DatedReview extends StatsReview {
  day: LocalDate;
}

function inWindow(day: LocalDate, w: DayWindow): boolean {
  return day >= w.start && day <= w.end;
}

function datedLive(reviews: readonly StatsReview[], ctx: DayContext): DatedReview[] {
  return reviews
    .filter((r) => r.undoneAt === null)
    .map((r) => ({ ...r, day: learningDay(r.reviewedAt, ctx.timeZone, ctx.dayStartHour) }));
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function cappedSeconds(durationMs: number): number {
  return Math.min(Math.max(durationMs, 0) / 1000, DURATION_CAP_SECONDS);
}

export function windowMetrics(
  reviews: readonly StatsReview[],
  window: DayWindow,
  ctx: DayContext,
): WindowMetrics {
  const rows = datedLive(reviews, ctx).filter((r) => inWindow(r.day, window));
  const first = rows.filter((r) => r.isFirstAttemptToday);
  const gotIt = first.filter((r) => r.grade === "got_it").length;
  return {
    cardsReviewed: first.length,
    gotItRate: first.length === 0 ? null : gotIt / first.length,
    medianSeconds: median(rows.map((r) => cappedSeconds(r.durationMs))),
    daysPractised: new Set(rows.map((r) => r.day)).size,
    daysInWindow: window.days,
  };
}

export interface PracticeBar {
  /** First day of the bar (the day itself, or the Monday of the week). */
  start: LocalDate;
  cardsReviewed: number;
  current: boolean;
}

/** Cards reviewed per day (week) or per week (month), highlighting today's period. */
export function practiceBars(
  reviews: readonly StatsReview[],
  range: StatsRange,
  today: LocalDate,
  ctx: DayContext,
): PracticeBar[] {
  const { current } = statsWindows(range, today);
  const step = range === "week" ? 1 : 7;
  const bars: PracticeBar[] = [];
  for (let i = 0; i < current.days / step; i++) {
    const start = addDays(current.start, i * step);
    bars.push({
      start,
      cardsReviewed: 0,
      current: range === "week" ? start === today : start === weekStart(today),
    });
  }
  for (const r of datedLive(reviews, ctx)) {
    if (!r.isFirstAttemptToday || !inWindow(r.day, current)) continue;
    bars[Math.floor(daysBetween(current.start, r.day) / step)]!.cardsReviewed++;
  }
  return bars;
}

export type StatsMetric = "cardsReviewed" | "gotItRate" | "timePerCard" | "daysPractised";

/** Change against the previous equal period in plain words, or null when not comparable. */
export function changeInWords(
  metric: StatsMetric,
  current: WindowMetrics,
  previous: WindowMetrics,
  range: StatsRange,
): string | null {
  const period = range === "week" ? "last week" : "the previous four weeks";
  const same = `Same as ${period}`;
  let diff: number;
  let up: string;
  let down: string;
  switch (metric) {
    case "cardsReviewed":
    case "daysPractised": {
      diff =
        metric === "cardsReviewed"
          ? current.cardsReviewed - previous.cardsReviewed
          : current.daysPractised - previous.daysPractised;
      const noun = metric === "daysPractised" ? (Math.abs(diff) === 1 ? " day" : " days") : "";
      up = `more${noun}`;
      down = `fewer${noun}`;
      break;
    }
    case "gotItRate": {
      if (current.gotItRate === null || previous.gotItRate === null) return null;
      diff = Math.round(current.gotItRate * 100) - Math.round(previous.gotItRate * 100);
      up = diff === 1 ? "point higher" : "points higher";
      down = diff === -1 ? "point lower" : "points lower";
      break;
    }
    case "timePerCard": {
      if (current.medianSeconds === null || previous.medianSeconds === null) return null;
      diff = Math.round(current.medianSeconds) - Math.round(previous.medianSeconds);
      up = "s slower";
      down = "s faster";
      break;
    }
  }
  if (diff === 0) return same;
  return `${Math.abs(diff)} ${diff > 0 ? up : down} than ${period}`;
}

export interface MasteryCard {
  deckId: string;
  topic: string;
  /** null means New (no card_state row). */
  box: number | null;
  lapses: number;
}

export interface MasteryBuckets {
  total: number;
  /** Never graded. */
  new: number;
  /** Box 1. */
  notYet: number;
  /** Boxes 2 and 3. */
  nearly: number;
  /** Boxes 4 and 5. */
  gotIt: number;
  /** Share of all cards, including New, in boxes 4 and 5; null for no cards. */
  mastery: number | null;
}

export function masteryBuckets(cards: readonly Pick<MasteryCard, "box">[]): MasteryBuckets {
  const b = { total: cards.length, new: 0, notYet: 0, nearly: 0, gotIt: 0 };
  for (const { box } of cards) {
    if (box === null) b.new++;
    else if (box >= MASTERED_MIN_BOX) b.gotIt++;
    else if (box >= 2) b.nearly++;
    else b.notYet++;
  }
  return { ...b, mastery: b.total === 0 ? null : b.gotIt / b.total };
}

export interface FocusTopic {
  deckId: string;
  topic: string;
  cards: number;
  mastery: number;
  lapses: number;
}

/**
 * The topics with the lowest mastery among topics with at least
 * FOCUS_NEXT_MIN_CARDS cards; ties go to more lapses, then topic name.
 * Topics are (deckId, topic) pairs since topics live per deck.
 */
export function focusNext(cards: readonly MasteryCard[]): FocusTopic[] {
  const groups = new Map<string, MasteryCard[]>();
  for (const c of cards) {
    const key = JSON.stringify([c.deckId, c.topic]);
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }
  const topics: FocusTopic[] = [];
  for (const list of groups.values()) {
    if (list.length < FOCUS_NEXT_MIN_CARDS) continue;
    topics.push({
      deckId: list[0]!.deckId,
      topic: list[0]!.topic,
      cards: list.length,
      mastery: masteryBuckets(list).mastery!,
      lapses: list.reduce((sum, c) => sum + c.lapses, 0),
    });
  }
  topics.sort(
    (a, b) =>
      a.mastery - b.mastery ||
      b.lapses - a.lapses ||
      a.topic.localeCompare(b.topic) ||
      a.deckId.localeCompare(b.deckId),
  );
  return topics.slice(0, FOCUS_NEXT_COUNT);
}

/** By-deck order: lowest mastery first, decks without cards last, then by name. */
export function sortByLowestMastery<T extends { name: string; mastery: number | null }>(
  decks: readonly T[],
): T[] {
  return [...decks].sort((a, b) => {
    if (a.mastery === null || b.mastery === null) {
      if (a.mastery !== b.mastery) return a.mastery === null ? 1 : -1;
    } else if (a.mastery !== b.mastery) return a.mastery - b.mastery;
    return a.name.localeCompare(b.name);
  });
}

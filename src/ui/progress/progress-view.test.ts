import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Stats } from "@/shared/schemas/stats";
import { ErrorState } from "@/ui/states/ErrorState";
import { PageSkeleton } from "@/ui/states/Skeleton";
import { ProgressView, type Range } from "./ProgressView";

const metrics = { cardsReviewed: 120, gotItRate: 0.64, medianSeconds: 12.4, daysPractised: 5, daysInWindow: 7 };
const stats = (range: Range, over: Partial<Stats> = {}) =>
  ({
    range,
    hasReviews: true,
    current: metrics,
    bars: [],
    focusNext: [],
    byDeck: [],
    changes: {
      cardsReviewed: "38 more than last week",
      gotItRate: "3 points lower than last week",
      timePerCard: null,
      daysPractised: "1 more than last week",
    },
    ...over,
  }) as unknown as Stats;
const render = (s: Stats, range: Range = s.range) =>
  renderToStaticMarkup(createElement(ProgressView, { stats: s, range, onRangeChange: () => {} }));

test("four tiles show values and plain-word changes", () => {
  const html = render(stats("week"));
  expect(html).toContain("Cards reviewed");
  expect(html).toContain("120");
  expect(html).toContain("Got it rate");
  expect(html).toContain("64%");
  expect(html).toContain("12 s");
  expect(html).toContain("5 of 7");
  expect(html).toContain("38 more than last week");
  expect(html).toContain("No earlier figure to compare");
  expect(html).not.toMatch(/streak|badge|Mastered/i);
});

test("the range switch marks the chosen range and the figures follow the data", () => {
  const month = stats("month", { current: { ...metrics, cardsReviewed: 410, daysPractised: 19, daysInWindow: 28 } });
  const html = render(month);
  expect(html).toMatch(/aria-pressed="true"[^>]*>This month/);
  expect(html).toMatch(/aria-pressed="false"[^>]*>This week/);
  expect(html).toContain("410");
  expect(html).toContain("19 of 28");
  expect(html).not.toContain("5 of 7");
});

test("empty state explains what appears after the first session", () => {
  const html = render(stats("week", { hasReviews: false }));
  expect(html).toContain("After your first practice session");
  expect(html).not.toContain("Got it rate");
});

test("loading and error states render", () => {
  expect(renderToStaticMarkup(createElement(PageSkeleton))).toContain('aria-label="Loading"');
  expect(renderToStaticMarkup(createElement(ErrorState, { onRetry: () => {} }))).toContain("Retry");
});

const deckRow = (name: string, over = {}) => ({
  deckId: name, name, color: null, cards: 40, mastered: 9, mastery: 0.2, medianSeconds: 14.2,
  lastPractisedAt: "2026-10-30T10:00:00Z", ...over,
});

test("Focus next says mastery and each topic has a Practise button", () => {
  const topics = ["A", "B", "C"].map((t, i) => ({
    deckId: "d1", deckName: "Química", topic: t, cards: 5, mastery: 0.1 * (i + 1), lapses: 0,
  }));
  const html = render(stats("week", { focusNext: topics }));
  expect(html).toContain("Focus next");
  expect(html.match(/Mastery \d+%/g)).toEqual(["Mastery 10%", "Mastery 20%", "Mastery 30%"]);
  expect(html.match(/aria-label="Practise [ABC]"/g)).toHaveLength(3);
});

test("By deck keeps the order given, shows Mastered as a count and no mastery rate", () => {
  const html = render(stats("week", { byDeck: [deckRow("Low"), deckRow("High", { mastered: 30 })] }));
  for (const h of ["Cards", "Mastered", "Median time", "Last practised"]) expect(html).toContain(h);
  expect(html.indexOf("Low")).toBeLessThan(html.indexOf("High"));
  expect(html).toContain("<td class=\"px-4 py-3\">9</td>");
  expect(html).toContain("14 s");
  expect(html).toContain("30 Oct 2026");
  expect(html.slice(html.indexOf("By deck"))).not.toMatch(/Mastery|%/);
});

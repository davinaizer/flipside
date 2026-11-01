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

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { PracticeChart } from "./PracticeChart";

const render = (
  range: "week" | "month",
  bars: { start: string; cardsReviewed: number; current: boolean }[],
) => renderToStaticMarkup(createElement(PracticeChart, { bars, range }));

const days = [
  "2026-10-26",
  "2026-10-27",
  "2026-10-28",
  "2026-10-29",
  "2026-10-30",
  "2026-10-31",
  "2026-11-01",
].map((start, i) => ({ start, cardsReviewed: i * 3, current: i === 6 }));

test("week shows a bar per day with every value and weekday labels", () => {
  const html = render("week", days);
  expect(html.match(/<li data-current/g)).toHaveLength(7);
  for (const v of [0, 3, 6, 9, 12, 15, 18]) expect(html).toContain(`>${v}</span>`);
  expect(html).toContain("Mon");
  expect(html).toContain("Cards practised each day");
});

test("month shows a bar per week", () => {
  const weeks = ["2026-10-12", "2026-10-19", "2026-10-26"].map((start, i) => ({
    start,
    cardsReviewed: 10 + i,
    current: i === 2,
  }));
  const html = render("month", weeks);
  expect(html.match(/<li data-current/g)).toHaveLength(3);
  expect(html).toContain("12 Oct");
  expect(html).toContain("Cards practised each week");
});

test("current period is marked by text and outline, not only colour", () => {
  const html = render("week", days);
  expect(html).toContain("Today");
  expect(html).toContain("outline-2");
  expect(html).toContain("(current)");
});

test("text alternative lists the figures; only semantic tokens, no raw colours", () => {
  const html = render("week", days);
  expect(html).toContain('role="img"');
  expect(html).toContain("day Mon: 0;");
  expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}|rgb\(/);
});

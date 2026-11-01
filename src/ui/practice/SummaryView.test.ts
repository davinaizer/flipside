import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { SessionSummary } from "@/shared/schemas/session";
import { formatDuration, SummaryView } from "./SummaryView";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const base: SessionSummary = {
  session: { id: id(0), scope: { kind: "all" }, length: 5, plannedCount: 5, startedAt: "", endedAt: "", endedReason: "completed" },
  counts: { not_yet: 2, nearly: 1, got_it: 3 },
  gradedCount: 6,
  durationMs: 240000,
  goAgain: [1, 2, 3].map((n) => ({ cardId: id(n), deckName: "Bio", topic: "Cells", front: `Question ${n}` })),
  missIds: [id(1), id(2)],
};
const render = (s: SessionSummary, failed = false) =>
  renderToStaticMarkup(createElement(SummaryView, { summary: s, starting: false, failed, onPractiseMisses: () => {} }));

test("shows counts with text labels, time, three cards and Back to Library", () => {
  const html = render(base);
  expect(html).toContain("3 Got it");
  expect(html).toContain("1 Nearly");
  expect(html).toContain("2 Not yet");
  expect(html).toContain("4 minutes");
  expect(html).toContain("Question 1");
  expect(html).toContain("Question 3");
  expect(html).toContain("Practise the misses");
  expect(html).toContain('href="/library"');
  expect(html).toContain("Back to Library");
});

test("hides Practise the misses and the go-again list with no misses", () => {
  const html = render({ ...base, counts: { not_yet: 0, nearly: 1, got_it: 3 }, goAgain: [], missIds: [] });
  expect(html).not.toContain("Practise the misses");
  expect(html).not.toContain("Cards to go again");
  expect(html).toContain("Back to Library");
});

test("no streak or pressure copy", () => {
  expect(render(base).toLowerCase()).not.toMatch(/streak|hurry|behind|don't break|keep it up/);
});

test("formatDuration", () => {
  expect(formatDuration(500)).toBe("under a minute");
  expect(formatDuration(60000)).toBe("1 minute");
});

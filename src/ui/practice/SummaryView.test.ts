import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { SessionSummary } from "@/shared/schemas/session";
import { formatDuration, SummaryView, summaryViewModel } from "./SummaryView";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const base: SessionSummary = {
  session: {
    id: id(0),
    scope: { kind: "all" },
    length: 5,
    plannedCount: 5,
    startedAt: "",
    endedAt: "",
    endedReason: "completed",
  },
  counts: { not_yet: 2, nearly: 1, got_it: 3 },
  gradedCount: 6,
  durationMs: 240000,
  deckName: "Bio",
  severalDecks: false,
  goAgain: [1, 2, 3].map((n) => ({
    cardId: id(n),
    deckName: "Bio",
    topic: "Cells",
    front: `Question ${n}`,
  })),
  missIds: [id(1), id(2)],
};
const render = (s: SessionSummary, failed = false) =>
  renderToStaticMarkup(
    createElement(SummaryView, { summary: s, starting: false, failed, onPractiseMisses: () => {} }),
  );

test("shows deck card, ring, time, grade chips, revisit panel and actions", () => {
  const html = render(base);
  expect(html).toContain("Bio");
  expect(html).toContain("<circle");
  expect(html).toContain(">6</span>");
  expect(html).toContain("Time spent: 4 minutes");
  expect(html).toContain("3 Got it");
  expect(html).toContain("1 Nearly");
  expect(html).toContain("2 Not yet");
  expect(html).toContain("<svg"); // chip icons
  expect(html).toContain("Cards to revisit");
  expect(html).toContain("2 for review");
  expect(html).toContain("Question 1");
  expect(html).toContain("Question 3");
  expect(html).not.toContain("Question 4");
  expect(html).toContain("Practise those now (2 cards)");
  expect(html).toContain('href="/library"');
  expect(html).toContain("Back to Library");
});

test("omits the README items 3, 7 and 20 extras", () => {
  const html = render(base);
  for (const banned of [
    "Focus clue",
    "Box 1",
    "Review all answers",
    "Flipside Focus",
    "Calm Horizon",
    "CALM HORIZON",
    "Retention",
    "Cram",
  ]) {
    expect(html).not.toContain(banned);
  }
});

test("hides the revisit panel and Practise those now with no misses", () => {
  const html = render({
    ...base,
    counts: { not_yet: 0, nearly: 1, got_it: 3 },
    goAgain: [],
    missIds: [],
  });
  expect(html).not.toContain("Practise those now");
  expect(html).not.toContain("Cards to revisit");
  expect(html).toContain("Back to Library");
});

test("no streak or pressure copy", () => {
  expect(render(base).toLowerCase()).not.toMatch(/streak|hurry|behind|don't break|keep it up/);
});

test("formatDuration", () => {
  expect(formatDuration(500)).toBe("under a minute");
  expect(formatDuration(60000)).toBe("1 minute");
});

test("view model matches the session figures", () => {
  const vm = summaryViewModel(base);
  expect(vm.deckLabel).toBe("Bio");
  expect(vm.cardsPractised).toBe(6);
  expect(vm.time).toBe("4 minutes");
  expect(vm.grades.map((g) => [g.grade, g.label, g.count])).toEqual([
    ["got_it", "Got it", 3],
    ["nearly", "Nearly", 1],
    ["not_yet", "Not yet", 2],
  ]);
  expect(vm.revisit).toHaveLength(3);
  expect(vm.revisit[0]).toEqual({
    cardId: id(1),
    grade: "not_yet",
    topic: "Cells",
    question: "Question 1",
  });
  expect(vm.revisitCount).toBe(2);
});

test("view model says Several decks and caps revisit at three", () => {
  const extra = { cardId: id(4), deckName: "Bio", topic: "Cells", front: "Q4" };
  const vm = summaryViewModel({
    ...base,
    deckName: null,
    severalDecks: true,
    goAgain: [...base.goAgain, extra] as never,
    missIds: [1, 2, 3, 4].map(id),
  });
  expect(vm.deckLabel).toBe("Several decks");
  expect(vm.revisit).toHaveLength(3);
  expect(vm.revisitCount).toBe(4);
});

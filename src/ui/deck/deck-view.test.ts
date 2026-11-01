import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DeckView } from "./DeckView";
import { anywayPlan, practisePlan } from "./practice-plan";

const m = { new: 0, notYet: 1, nearly: 1, gotIt: 2 };
const topics = [
  { topic: "Cells", cardCount: 4, dueCount: 3, mastery: m, masteredPercent: 50 },
  { topic: "Energy", cardCount: 4, dueCount: 0, mastery: m, masteredPercent: 25 },
];
const D = "11111111-1111-4111-8111-111111111111";
const html = (ticked: string[]) =>
  renderToStaticMarkup(
    createElement(DeckView, {
      deck: { id: D, name: "Science", cardCount: 8, topics },
      ticked: new Set(ticked),
      onToggle() {},
      busy: false,
      startError: null,
      onStart() {},
    }),
  );

test("topics show counts, mastery legend and mastered percentage", () => {
  const out = html([]);
  expect(out).toContain("4 cards");
  expect(out).toContain("3 due");
  expect(out).toContain("50% mastered");
  expect(out).toContain("Got it 2");
});

test("with none ticked Practise scopes the deck and states the due count", () => {
  const p = practisePlan(D, topics, new Set());
  expect(p.label).toBe("Practise deck (3 due)");
  expect(p.scope).toEqual({ kind: "deck", deckId: D });
  expect(anywayPlan(D, topics, new Set())).toBeNull();
  expect(html([])).not.toContain("anyway");
});

test("with topics ticked Practise scopes them and states topic and due counts", () => {
  const p = practisePlan(D, topics, new Set(["Cells", "Energy"]));
  expect(p.label).toBe("Practise 2 topics (3 due)");
  expect(p.scope).toEqual({ kind: "topics", deckId: D, topics: ["Cells", "Energy"] });
});

test("a ticked topic with nothing due offers a labelled practise-anyway ignoring due dates", () => {
  const a = anywayPlan(D, topics, new Set(["Cells", "Energy"]));
  expect(a?.label).toBe("Practise 1 topic with nothing due anyway (ignores due dates)");
  expect(a?.scope).toEqual({ kind: "topics", deckId: D, topics: ["Energy"], ignoreDue: true });
  expect(html(["Energy"])).toContain("anyway");
  expect(html(["Cells"])).not.toContain("anyway");
});

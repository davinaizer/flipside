import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { deleteSummary } from "./delete-deck/DeleteDeck";
import { NeedsRewording } from "./needs-rewording/NeedsRewording";
import { DeckView } from "./DeckView";
import { anywayPlan, practisePlan } from "./practice-plan";

// EditDeck and DeleteDeck call useRouter, which needs a mounted app router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));

const m = { new: 0, notYet: 1, nearly: 1, gotIt: 2 };
const topics = [
  { topic: "Cells", cardCount: 4, dueCount: 3, mastery: m, masteredPercent: 50 },
  { topic: "Energy", cardCount: 4, dueCount: 0, mastery: m, masteredPercent: 25 },
];
const D = "11111111-1111-4111-8111-111111111111";
const html = (ticked: string[]) =>
  renderToStaticMarkup(
    createElement(DeckView, {
      deck: { id: D, name: "Science", groupName: null, color: null, answerStyle: "paragraph", cardCount: 8, reviewCount: 12, topics },
      leeches: [],
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

test("the deck page offers edit, delete and re-import into the same deck", () => {
  const out = html([]);
  expect(out).toContain("Edit deck");
  expect(out).toContain("Delete deck");
  expect(out).toContain(`href="/import?deckId=${D}"`);
});

test("delete confirmation states how many cards and review records go", () => {
  expect(deleteSummary("Science", 8, 12)).toContain("8 cards and 12 review records");
  expect(deleteSummary("Science", 1, 1)).toContain("1 card and 1 review record.");
});

test("Needs rewording lists leeches with lapse counts and is absent with none", () => {
  expect(renderToStaticMarkup(createElement(NeedsRewording, { leeches: [] }))).toBe("");
  const out = renderToStaticMarkup(
    createElement(NeedsRewording, { leeches: [{ id: "a", topic: "Cells", front: "What is a cell?", lapses: 9 }] }),
  );
  expect(out).toContain("Needs rewording");
  expect(out).toContain("What is a cell?");
  expect(out).toContain("missed 9 times");
});

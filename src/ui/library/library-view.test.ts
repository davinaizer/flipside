import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Library } from "@/shared/schemas/library";
import { LibraryView } from "./LibraryView";

const mastery = { new: 0, notYet: 0, nearly: 0, gotIt: 0 };
const deck = (id: string, name: string, topics: string[]) => ({
  id,
  name,
  groupName: null,
  color: null,
  answerStyle: "bullets" as const,
  topicCount: topics.length,
  topics,
  cardCount: 3,
  dueCount: 0,
  mastery,
});
const today = { dueCount: 0, startableCount: 0, decksWithDue: 0, sessionLength: 10, weakCount: 0 };
const full = {
  today,
  groups: [
    { name: "Other", decks: [deck("1", "Química", ["Ácidos"]), deck("2", "History", ["Tudors"])] },
  ],
} as unknown as Library;

const render = (library: Library, query = "") =>
  renderToStaticMarkup(
    createElement(LibraryView, {
      library,
      busy: false,
      startError: null,
      onStart: () => {},
      query,
      onQueryChange: () => {},
    }),
  );

test("search matches deck and topic names, ignoring case and accents", () => {
  const byDeck = render(full, "quimica");
  expect(byDeck).toContain("Química");
  expect(byDeck).not.toContain("History");
  const byTopic = render(full, "TUDORS");
  expect(byTopic).toContain("History");
  expect(byTopic).not.toContain("Química");
  expect(render(full, "acidos")).toContain("Química");
});

test("no match shows a neutral message", () => {
  const html = render(full, "zzz");
  expect(html).toContain("Nothing matches that search");
  expect(html).not.toContain("History");
});

test("Add deck links to /import", () => {
  expect(render(full)).toContain('href="/import"');
});

test("no decks shows one Add deck, the template and a plain line", () => {
  const html = render({ today, groups: [] } as unknown as Library);
  expect(html.match(/Add deck/g)).toHaveLength(1);
  expect(html).toContain("Download CSV template");
  expect(html).toContain("topic, front and back columns");
  expect(html).not.toContain("Search");
});

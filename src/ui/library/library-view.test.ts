import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Library } from "@/shared/schemas/library";
import { DeckMenuItems } from "./DeckMenu";
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
  reviewCount: 0,
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
      onDeckChanged: () => {},
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

test("each deck card has a 44 px menu button named for the deck, closed by default", () => {
  const out = render(full);
  expect(out).toContain('aria-label="Deck actions for Química"');
  expect(out).toContain('aria-label="Deck actions for History"');
  expect(out.match(/aria-haspopup="menu"/g)).toHaveLength(2);
  expect(out).toContain("size-11");
  expect(out).not.toContain('role="menu"');
  // The card link stays the only link to the deck; the menu items are not tab stops.
  expect(out.match(/href="\/decks\//g)).toHaveLength(2);
});

test("the open menu lists Edit deck and Re-import with the deck id", () => {
  const out = renderToStaticMarkup(createElement(DeckMenuItems, { deckId: "abc", onEdit: () => {} }));
  expect(out).toContain("Edit deck");
  expect(out).toContain('href="/import?deckId=abc"');
  expect(out).toContain("Re-import");
  expect(out.match(/tabindex="-1"/g)).toHaveLength(2);
});

test("Up to date tag sits in the title row, before the topic and card counts", () => {
  const html = render(full);
  const row = html.indexOf("Up to date");
  expect(row).toBeGreaterThan(html.indexOf("Química"));
  expect(row).toBeLessThan(html.indexOf("1 topic"));
  // Same wrapping row as the title link, so it wraps under the title on iPad portrait.
  const rowStart = html.lastIndexOf("flex-wrap items-center gap-x-3", row);
  expect(html.slice(rowStart, row)).toContain('href="/decks/1"');
});

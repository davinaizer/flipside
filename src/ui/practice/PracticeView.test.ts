import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import type { SessionCardPayload } from "@/shared/schemas/session";
import { PracticeLoading } from "./PracticeScreen";
import { FRONT_HINT, PracticeView, SessionProgress } from "./PracticeView";

const img = (id: string) => ({ id, url: `/api/v1/images/${id}`, width: 10, height: 10 });
const card: SessionCardPayload = {
  cardId: "c1",
  deckId: "d1",
  deckName: "Bio",
  answerStyle: "bullets",
  topic: "Cells",
  front: "What is <b>DNA</b>?",
  back: "first <i>point</i>\nsecond point",
  frontImage: img("front-img"),
  backImage: img("back-img"),
  labels: { not_yet: "Again today", nearly: "Tomorrow", got_it: "In 3 days" },
};
const render = (revealed: boolean, c = card) =>
  renderToStaticMarkup(
    createElement(PracticeView, { card: c, revealed, done: 1, total: 4, settings: DEFAULT_SETTINGS, onReveal: () => {} }),
  );

test("front: chip, question, exact hint, Show answer, front image only", () => {
  const html = render(false);
  expect(html).toContain("Cells");
  expect(html).toContain(FRONT_HINT);
  expect(FRONT_HINT).toBe("Say your answer out loud first, then show it.");
  expect(html).toContain("Show answer");
  expect(html).toContain("front-img");
  expect(html).not.toContain("back-img");
  expect(html).not.toContain("second point");
});

test("back: small question, bullets, back image only, no Show answer", () => {
  const html = render(true);
  expect(html).toContain('data-testid="question-small"');
  expect(html).toContain("<li>");
  expect(html).toContain("back-img");
  expect(html).not.toContain("front-img");
  expect(html).not.toContain("Show answer");
});

test("a paragraph deck shows a paragraph, not a list", () => {
  const html = render(true, { ...card, answerStyle: "paragraph" });
  expect(html).not.toContain("<li>");
  expect(html).toContain("first &lt;i&gt;point&lt;/i&gt;");
});

test("HTML in card text renders as literal text", () => {
  const html = render(false) + render(true);
  expect(html).toContain("What is &lt;b&gt;DNA&lt;/b&gt;?");
  expect(html).not.toContain("<b>");
  expect(html).not.toContain("<i>");
});

test("reading settings style the card text", () => {
  const html = renderToStaticMarkup(
    createElement(PracticeView, {
      card, revealed: false, done: 0, total: 1, onReveal: () => {},
      settings: { ...DEFAULT_SETTINGS, textSize: 4, cardColor: "night" },
    }),
  );
  expect(html).toContain("font-size:26px");
  expect(html).toContain("var(--card-night)");
});

test("progress shows done, current and remaining with a text count", () => {
  const html = renderToStaticMarkup(createElement(SessionProgress, { done: 2, total: 5 }));
  expect(html.match(/data-segment="done"/g)).toHaveLength(2);
  expect(html.match(/data-segment="current"/g)).toHaveLength(1);
  expect(html.match(/data-segment="remaining"/g)).toHaveLength(2);
  expect(html).toContain("Card 3 of 5");
});

test("the loading skeleton renders", () => {
  expect(renderToStaticMarkup(createElement(PracticeLoading))).toContain('aria-label="Loading"');
});

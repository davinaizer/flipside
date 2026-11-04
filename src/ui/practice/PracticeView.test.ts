import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import type { SessionCardPayload } from "@/shared/schemas/session";
import { shortcutFor } from "./shortcuts";
import { PracticeLoading } from "./PracticeScreen";
import { FRONT_HINT, PracticeView, SessionCount, SessionProgress } from "./PracticeView";

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
const face = (html: string, name: "front" | "back") => {
  const start = html.indexOf(`data-face="${name}"`);
  const end = html.indexOf('data-face="', start + 1);
  return html.slice(start, end === -1 ? html.indexOf("</article>") : end);
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
  expect(face(html, "front")).toContain("front-img");
  expect(face(html, "front")).not.toContain("back-img");
  expect(face(html, "front")).not.toContain("second point");
  expect(face(html, "back")).toMatch(/^data-face="back" aria-hidden="true" inert/);
  expect(face(html, "front")).toMatch(/^data-face="front" aria-hidden="false"/);
});

test("back: small question, bullets, back image only, no Show answer", () => {
  const html = render(true);
  const back = face(html, "back");
  expect(back).toContain('data-testid="question-small"');
  expect(back).toContain("<li>");
  expect(back).toContain("back-img");
  expect(face(html, "front")).toMatch(/^data-face="front" aria-hidden="true" inert/);
  expect(face(html, "back")).toMatch(/^data-face="back" aria-hidden="false"/);
  expect(face(html, "front")).not.toContain("back-img");
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
  const count = renderToStaticMarkup(createElement(SessionCount, { deckName: "Science", done: 2, total: 5 }));
  expect(count).toContain("Card 3 of 5");
  expect(count).toContain("Science");
});

test("the loading skeleton renders", () => {
  expect(renderToStaticMarkup(createElement(PracticeLoading))).toContain('aria-label="Loading"');
});

test("front: eye icon on Show answer; the hint is inside the front face, as in the Settings preview", () => {
  const html = render(false);
  expect(html.slice(html.indexOf("<button"), html.indexOf("Show answer"))).toContain("<svg");
  expect(face(html, "front")).toContain(FRONT_HINT);
  expect(html.split(FRONT_HINT)).toHaveLength(2);
});

test("the front face is the shared PracticeFront component (read-aloud slot on the chip row)", () => {
  const reader = { speak: () => {}, cancel: () => {} };
  const html = renderToStaticMarkup(
    createElement(PracticeView, { card, revealed: false, done: 0, total: 1, settings: DEFAULT_SETTINGS, onReveal: () => {}, reader }),
  );
  const front = face(html, "front");
  expect(front).toContain("Read question aloud");
  expect(front.indexOf("Cells")).toBeLessThan(front.indexOf("Read question aloud"));
  expect(front.indexOf("Read question aloud")).toBeLessThan(front.indexOf("Question</p>"));
});

test("reveal triggers: the card tap is wired like the button, and Space is a shortcut", () => {
  let calls = 0;
  const tree = PracticeView({ card, revealed: false, done: 0, total: 1, settings: DEFAULT_SETTINGS, onReveal: () => calls++ });
  const scene = JSON.stringify(tree, (k, v) => (typeof v === "function" ? `fn:${k}` : v));
  expect(scene).toContain('"flip-scene"');
  expect(scene).toContain('"onClick":"fn:onClick"'); // the scene and Show answer both carry onClick
  expect(shortcutFor({ key: " ", target: null }, { revealed: false, dialogOpen: false })).toEqual({ type: "reveal" });
  expect(calls).toBe(0);
});

test("the flip uses CSS perspective, rotateY and backface-visibility only", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  expect(css).toMatch(/perspective:/);
  expect(css).toMatch(/rotateY\(180deg\)/);
  expect(css).toMatch(/backface-visibility:\s*hidden/);
});

test("a revealed card is only rotated by its own data-revealed flag, so a new card starts unrotated", () => {
  expect(render(false)).toContain('data-revealed="false"');
  expect(render(true)).toContain('data-revealed="true"');
});

test("reduced motion applies no rotation and no transition, showing the live face in place", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  expect(block).toMatch(/\.flip-card\[data-revealed="true"\]/);
  expect(block).toMatch(/transform:\s*none/);
  expect(block).toMatch(/transition:\s*none/);
  expect(block).toMatch(/\.flip-face\[inert\]\s*\{\s*display:\s*none/);
});

test("Undo last remounts the card scene (key includes done), so it returns to the front without a reverse flip", () => {
  const keyOf = (done: number) => {
    const tree = PracticeView({ card, revealed: false, done, total: 3, settings: DEFAULT_SETTINGS, onReveal() {} });
    const kids = (tree.props as { children: unknown[] }).children.flat() as { key?: string; props?: { className?: string } }[];
    return kids.find((c) => c?.props?.className === "flip-scene")?.key;
  };
  expect(keyOf(1)).toBeDefined();
  expect(keyOf(1)).not.toBe(keyOf(0));
});

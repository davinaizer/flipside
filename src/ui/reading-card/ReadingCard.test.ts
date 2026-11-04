import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { CARD_COLORS, FONT_IDS } from "@/shared/enums";
import { TEXT_SIZE_STEPS } from "@/shared/constants";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { ReadingCard, readingStyle } from "./ReadingCard";

test("every T1 option exists", () => {
  expect(FONT_IDS).toEqual(["atkinson", "lexend", "system"]);
  expect(CARD_COLORS).toEqual(["mist", "cream", "peach", "sage", "lavender", "night"]);
  expect(TEXT_SIZE_STEPS).toHaveLength(4);
});

test("body text is never under 16 px, at any size step", () => {
  for (let textSize = 1; textSize <= 4; textSize++) {
    expect(parseInt(String(readingStyle({ ...DEFAULT_SETTINGS, textSize }).fontSize))).toBeGreaterThanOrEqual(16);
  }
});

test("the card style follows the settings and sets card text only", () => {
  const s = readingStyle({ ...DEFAULT_SETTINGS, font: "system", letterSpacing: 3, lineSpacing: 3, cardColor: "night" });
  expect(s.fontFamily).toContain("system-ui");
  expect(s.letterSpacing).toBe("0.1em");
  expect(s.lineHeight).toBe(2);
  expect(s.backgroundColor).toBe("var(--card-night)");
  expect(s.color).toBe("var(--on-card-night)");
  const html = renderToStaticMarkup(
    createElement(ReadingCard, { settings: DEFAULT_SETTINGS, topic: "T", question: "Q?", hint: "H" }),
  );
  expect(html).toContain("Q?");
  expect(html).toContain("text-left");
});

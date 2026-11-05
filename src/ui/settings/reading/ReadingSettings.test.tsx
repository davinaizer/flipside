import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { FRONT_HINT, iconButton } from "@/ui/practice/PracticeView";
import { PracticeFront } from "@/ui/reading-card/ReadingCard";
import { Icon } from "@/ui/icons/Icon";
import { SettingsProvider } from "../SettingsProvider";
import { ReadingSettings } from "./ReadingSettings";

test("the settings screen lists every T1 option and Reset to defaults", () => {
  const html = renderToStaticMarkup(
    <SettingsProvider initial={DEFAULT_SETTINGS}>
      <ReadingSettings />
    </SettingsProvider>,
  );
  for (const t of [
    "Atkinson Hyperlegible Next",
    "Lexend",
    "System Sans",
    "Small",
    "Medium",
    "Large",
    "Extra large",
    "Normal",
    "Wide",
    "Wider",
    "Roomy",
    "Extra roomy",
    "Mist",
    "Cream",
    "Peach",
    "Sage",
    "Lavender",
    "Night",
    "Reset to defaults",
    "Preview",
  ])
    expect(html).toContain(t);
});

test("the preview shows the practice card elements and follows the settings (T8)", () => {
  const html = (cardColor: "mist" | "night") =>
    renderToStaticMarkup(
      <SettingsProvider initial={{ ...DEFAULT_SETTINGS, cardColor }}>
        <ReadingSettings />
      </SettingsProvider>,
    );
  const mist = html("mist");
  for (const t of ["Caching", "Question", "Why use a cache?"]) {
    expect(mist).toContain(t);
  }
  expect(mist).toContain("rounded-full border border-card-edge"); // the read-aloud button (iconButton)
  // Same component, not just the same words: the markup equals a PracticeFront render with the preview's props.
  const direct = renderToStaticMarkup(
    createElement(PracticeFront, {
      "data-testid": "reading-card",
      settings: DEFAULT_SETTINGS,
      topic: "Caching",
      question: "Why use a cache?",
      readAloud: createElement(
        "span",
        { "aria-hidden": "true", className: iconButton },
        createElement(Icon, { name: "volume" }),
      ),
    }),
  );
  expect(mist).toContain(direct);
  expect(direct).not.toContain(FRONT_HINT); // R15: the hint is outside the card, below it, as in practice
  expect(mist).toContain(FRONT_HINT);
  expect(mist.indexOf(FRONT_HINT)).toBeGreaterThan(mist.indexOf(direct) + direct.length - 1);
  expect(mist).toContain("var(--card-mist)");
  expect(html("night")).toContain("var(--card-night)");
});

test("the Reading section is its own surface with a heading (T9)", () => {
  const html = renderToStaticMarkup(
    <SettingsProvider initial={DEFAULT_SETTINGS}>
      <ReadingSettings />
    </SettingsProvider>,
  );
  expect(html).toMatch(/<section[^>]*rounded-card[^>]*bg-surface-card/);
  expect(html).toMatch(/<h2[^>]*>Reading</);
  expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
});

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { FRONT_HINT } from "@/ui/practice/PracticeView";
import { SettingsProvider } from "../SettingsProvider";
import { ReadingSettings } from "./ReadingSettings";

test("the settings screen lists every T1 option and Reset to defaults", () => {
  const html = renderToStaticMarkup(
    <SettingsProvider initial={DEFAULT_SETTINGS}>
      <ReadingSettings />
    </SettingsProvider>,
  );
  for (const t of [
    "Atkinson Hyperlegible Next", "Lexend", "System Sans",
    "Small", "Medium", "Large", "Extra large",
    "Normal", "Wide", "Wider", "Roomy", "Extra roomy",
    "Mist", "Cream", "Peach", "Sage", "Lavender", "Night",
    "Reset to defaults", "Preview",
  ]) expect(html).toContain(t);
});

test("the preview shows the practice card elements and follows the settings (T8)", () => {
  const html = (cardColor: "mist" | "night") =>
    renderToStaticMarkup(
      <SettingsProvider initial={{ ...DEFAULT_SETTINGS, cardColor }}>
        <ReadingSettings />
      </SettingsProvider>,
    );
  const mist = html("mist");
  for (const t of ["Caching", "Question", "Why use a cache?", FRONT_HINT]) {
    expect(mist).toContain(t);
  }
  expect(mist).toContain("rounded-full border border-card-edge"); // the read-aloud button (iconButton)
  expect(mist).toContain("var(--card-mist)");
  expect(html("night")).toContain("var(--card-night)");
});

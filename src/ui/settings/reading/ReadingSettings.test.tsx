import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
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

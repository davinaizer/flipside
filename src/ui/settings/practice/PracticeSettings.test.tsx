import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { SettingsProvider } from "../SettingsProvider";
import { PracticeSettings, parseNewCards } from "./PracticeSettings";

test("the Practice section shows every T2 option with the defaults selected", () => {
  const html = renderToStaticMarkup(
    <SettingsProvider initial={DEFAULT_SETTINGS}>
      <PracticeSettings />
    </SettingsProvider>,
  );
  for (const t of ["Cards per session", "All due", "New cards per day", 'value="10"', "Read questions aloud", "Slow", "Normal", "Fast"])
    expect(html).toContain(t);
  expect(html).not.toMatch(/>\s*(On|Off)\s*</);
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-checked="false"');
  expect(html).toMatch(/aria-pressed="true"[^>]*>5</);
  expect(html).toMatch(/aria-pressed="true"[^>]*>Normal</);
});

test("new cards per day must be a non-negative whole number", () => {
  expect(parseNewCards("0")).toBe(0);
  expect(parseNewCards("15")).toBe(15);
  for (const bad of ["", "-1", "2.5", "abc", "1e2", "101"]) expect(parseNewCards(bad)).toBeNull();
});

test("the read aloud switch reflects the setting in aria-checked", () => {
  const html = renderToStaticMarkup(
    <SettingsProvider initial={{ ...DEFAULT_SETTINGS, readAloud: true }}>
      <PracticeSettings />
    </SettingsProvider>,
  );
  expect(html).toMatch(/role="switch"[^>]*aria-checked="true"|aria-checked="true"[^>]*role="switch"/);
  expect(html).not.toMatch(/>\s*(On|Off)\s*</);
});

test("the Practice section is its own surface with a heading (T9)", () => {
  const html = renderToStaticMarkup(
    <SettingsProvider initial={DEFAULT_SETTINGS}>
      <PracticeSettings />
    </SettingsProvider>,
  );
  expect(html).toMatch(/<section[^>]*rounded-card[^>]*bg-surface-card/);
  expect(html).toMatch(/<h2[^>]*>Practice</);
  expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
});

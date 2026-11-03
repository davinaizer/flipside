import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";

vi.mock("@/ui/settings/SettingsProvider", () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, update: () => Promise.resolve() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import { ProfilePicker } from "@/ui/profile/ProfilePicker";

test("profile picker: the same named switch sits top-right", () => {
  const html = renderToStaticMarkup(<ProfilePicker />);
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-label="Dark theme"');
  expect(html).toMatch(/absolute right-8 top-4/);
});

test("practice load error and no-cards state have no theme switch; the summary load error keeps it", async () => {
  const { LoadError, NoCards } = await import("./PracticeScreen");
  expect(renderToStaticMarkup(<LoadError onRetry={() => {}} />)).not.toContain("Dark theme");
  expect(renderToStaticMarkup(<NoCards onEnd={() => {}} />)).not.toContain("Dark theme");
  const html = renderToStaticMarkup(<LoadError onRetry={() => {}} withTheme />);
  expect(html.indexOf('aria-label="Dark theme"')).toBeGreaterThan(-1);
  expect(html.indexOf('aria-label="Dark theme"')).toBeLessThan(html.indexOf('role="alert"'));
});

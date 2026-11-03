import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";

vi.mock("@/ui/settings/SettingsProvider", () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, update: () => Promise.resolve() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import { ProfilePicker } from "@/ui/profile/ProfilePicker";
import { PracticeHeaderActions } from "./PracticeScreen";

test("practice top bar: the theme switch comes right before the settings shortcut", () => {
  const html = renderToStaticMarkup(<PracticeHeaderActions onOpenSettings={() => {}} />);
  expect(html.indexOf('aria-label="Dark theme"')).toBeGreaterThan(-1);
  expect(html.indexOf('aria-label="Dark theme"')).toBeLessThan(html.indexOf('aria-label="Reading settings"'));
});

test("profile picker: the same named switch sits top-right", () => {
  const html = renderToStaticMarkup(<ProfilePicker />);
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-label="Dark theme"');
  expect(html).toMatch(/absolute right-8 top-4/);
});

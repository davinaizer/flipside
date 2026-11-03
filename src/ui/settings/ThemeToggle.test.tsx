import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";

const update = vi.fn(() => Promise.resolve());
let theme: "light" | "dark" = "light";
vi.mock("./SettingsProvider", () => ({
  useSettings: () => ({ settings: { ...DEFAULT_SETTINGS, theme }, update }),
}));

import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  update.mockClear();
  theme = "light";
});

test("a switch with an accessible name, both icons and no visible text", () => {
  const html = renderToStaticMarkup(<ThemeToggle />);
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-label="Dark theme"');
  expect(html).toContain('aria-checked="false"');
  expect(html.match(/<svg/g)).toHaveLength(2);
  expect(html.replace(/<[^>]*>/g, "").trim()).toBe("");
  theme = "dark";
  expect(renderToStaticMarkup(<ThemeToggle />)).toContain('aria-checked="true"');
});

test("click flips the theme through the settings saver", () => {
  // No DOM here, so call the component and fire the handler it hands to the button.
  (ThemeToggle().props as { onClick: () => void }).onClick();
  expect(update).toHaveBeenCalledWith({ theme: "dark" });
  theme = "dark";
  (ThemeToggle().props as { onClick: () => void }).onClick();
  expect(update).toHaveBeenLastCalledWith({ theme: "light" });
});

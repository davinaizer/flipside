"use client";

import { useSettings } from "./SettingsProvider";

export function ThemeToggle() {
  const { settings, update } = useSettings();
  const dark = settings.theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => update({ theme: dark ? "light" : "dark" }).catch(() => {})}
      className="flex min-h-11 items-center rounded-full px-4 text-on-surface hover:bg-surface-container-high"
    >
      Dark theme: {dark ? "On" : "Off"}
    </button>
  );
}

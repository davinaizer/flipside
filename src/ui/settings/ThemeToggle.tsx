"use client";

import { Icon } from "@/ui/icons/Icon";
import { useSettings } from "./SettingsProvider";

/**
 * One switch showing a sun and a moon, no visible text (T6). The knob sits over the icon of the
 * current theme; the accessible name and aria-checked carry the state for assistive tech.
 */
export function ThemeToggle() {
  const { settings, update } = useSettings();
  const dark = settings.theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark theme"
      aria-checked={dark}
      onClick={() => update({ theme: dark ? "light" : "dark" }).catch(() => {})}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="relative flex h-8 w-16 items-center justify-between rounded-full bg-surface-container-high px-2 text-on-surface-variant">
        <span
          aria-hidden="true"
          className={`absolute left-1 size-6 rounded-full bg-primary transition-transform ${dark ? "translate-x-8" : ""}`}
        />
        <span className={`relative ${dark ? "" : "text-on-primary"}`}><Icon name="sun" size={16} /></span>
        <span className={`relative ${dark ? "text-on-primary" : ""}`}><Icon name="moon" size={16} /></span>
      </span>
    </button>
  );
}

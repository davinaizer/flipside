"use client";

import { Icon } from "@/ui/icons/Icon";
import { SwitchTrack } from "./Choice";
import { useSettings } from "./SettingsProvider";

/** A real switch (track and knob) so it reads as a control; the text carries the state too. */
export function ThemeToggle() {
  const { settings, update } = useSettings();
  const dark = settings.theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => update({ theme: dark ? "light" : "dark" }).catch(() => {})}
      className="flex min-h-11 items-center justify-between gap-3 rounded-full px-2 text-on-surface hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <Icon name={dark ? "moon" : "sun"} />
        Dark theme: {dark ? "On" : "Off"}
      </span>
      <SwitchTrack on={dark} />
    </button>
  );
}

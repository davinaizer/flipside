"use client";

import { useSyncExternalStore } from "react";
import { ThemeSwitch } from "./ThemeToggle";

/**
 * Theme switch for screens with no profile or SettingsProvider (picker, root error page):
 * it only sets data-theme and is not saved.
 */
export function AttributeThemeSwitch() {
  // The server renders the theme (the last profile's, or light); follow the attribute so the switch always shows it.
  const dark = useSyncExternalStore(
    watchTheme,
    () => document.documentElement.getAttribute("data-theme") === "dark",
    () => false,
  );
  return (
    <ThemeSwitch
      dark={dark}
      onToggle={() => document.documentElement.setAttribute("data-theme", dark ? "light" : "dark")}
    />
  );
}

function watchTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

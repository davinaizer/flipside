"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Settings } from "@/shared/settings";
import { api } from "@/ui/api/client";
import { createSettingsSaver } from "./saver";

type Value = {
  settings: Settings;
  /** Applies the change at once, then saves it; on failure the previous value comes back. */
  update: (patch: Partial<Settings>) => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

/**
 * Holds the signed-in profile's settings. The server renders data-theme on <html> from the same
 * stored value, so a reload never flashes the wrong theme; this provider keeps the attribute in
 * step afterwards (toggle, or a different profile's settings after switching).
 * Mount with key={profileId} so a switch starts from that profile's settings.
 */
export function SettingsProvider({
  initial,
  children,
}: {
  initial: Settings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(initial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const [update] = useState(() => createSettingsSaver(initial, api.saveSettings, setSettings));

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export function useSettings(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings needs a SettingsProvider");
  return v;
}

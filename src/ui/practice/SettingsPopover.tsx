"use client";

import { useEffect, useRef } from "react";
import { ReadingSettings } from "@/ui/settings/reading/ReadingSettings";

/**
 * Reading settings over the session (R13). It is an overlay, so the session screen underneath
 * stays mounted and closing returns to the same card and side. Changes apply live through the
 * SettingsProvider the card text reads from.
 */
export function SettingsPopover({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface-container-high p-4">
      <div role="dialog" aria-modal="true" aria-label="Reading settings" className="w-full max-w-4xl rounded-3xl border border-outline-variant bg-surface p-6 text-on-surface">
        <ReadingSettings />
        <button ref={closeRef} type="button" onClick={onClose} className="mt-6 min-h-11 rounded-full bg-primary px-8 text-on-primary">
          Done
        </button>
      </div>
    </div>
  );
}

export function SettingsShortcut({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" className="min-h-11 self-end rounded-full px-4 text-on-surface-variant underline">
      Reading settings
    </button>
  );
}

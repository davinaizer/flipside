"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/ui/icons/Icon";
import { ReadingSettings } from "@/ui/settings/reading/ReadingSettings";
import { iconButton } from "./PracticeView";
import { buttonClass } from "@/ui/button/button-class";

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface-container-high safe-area safe-t safe-r safe-b safe-l [--edge:1rem]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reading settings"
        className="w-full max-w-4xl rounded-3xl border border-outline-variant bg-surface p-6 shadow-card text-on-surface"
      >
        <ReadingSettings />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={buttonClass("primary", { extra: "mt-6" })}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function SettingsShortcut({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label="Reading settings"
      className={iconButton}
    >
      <Icon name="settings" />
    </button>
  );
}

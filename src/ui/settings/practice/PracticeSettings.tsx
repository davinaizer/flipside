"use client";

import { useState } from "react";
import { READING_SPEEDS } from "@/shared/enums";
import type { Settings } from "@/shared/settings";
import { TAPPABLE_CARD } from "@/ui/button/button-class";
import { Choice, SwitchTrack } from "../Choice";
import { useSettings } from "../SettingsProvider";

const MAX_NEW = 100; // mirrors settingsSchema.newCardsPerDay
const LENGTHS: { value: Settings["cardsPerSession"]; label: string }[] = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: "all", label: "All due" },
];
const SPEED_LABEL = { slow: "Slow", normal: "Normal", fast: "Fast" } as const;

/** Returns the parsed value, or null when the text is not a whole number from 0 to MAX_NEW. */
export function parseNewCards(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text);
  return n <= MAX_NEW ? n : null;
}

/** Practice settings (T2): session length, new cards per day, read aloud, reading speed. Valid changes save at once. */
export function PracticeSettings() {
  const { settings, update } = useSettings();
  const set = (patch: Partial<Settings>) => update(patch).catch(() => {});
  const [text, setText] = useState(String(settings.newCardsPerDay));
  const invalid = parseNewCards(text) === null;

  return (
    <section
      aria-labelledby="practice-h"
      className="mt-8 rounded-card border border-card-edge bg-surface-card p-6 shadow-card md:p-8"
    >
      <h2 id="practice-h" className="text-headline-md font-semibold">
        Practice
      </h2>
      <fieldset className="mt-6">
        <legend className="mb-2 font-semibold">Cards per session</legend>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((l) => (
            <Choice
              key={l.label}
              on={settings.cardsPerSession === l.value}
              onClick={() => set({ cardsPerSession: l.value })}
            >
              {l.label}
            </Choice>
          ))}
        </div>
      </fieldset>
      <div className="mt-6">
        <label htmlFor="new-cards" className="mb-2 block font-semibold">
          New cards per day
        </label>
        <input
          id="new-cards"
          inputMode="numeric"
          value={text}
          aria-invalid={invalid}
          aria-describedby={invalid ? "new-cards-error" : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseNewCards(e.target.value);
            if (n !== null) set({ newCardsPerDay: n });
          }}
          className="min-h-11 w-28 rounded-full border border-outline-variant bg-surface-card px-4 text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        {invalid && (
          <p id="new-cards-error" role="alert" className="mt-2 text-error">
            Enter a whole number from 0 to {MAX_NEW}.
          </p>
        )}
      </div>
      <div className="mt-6">
        <button
          type="button"
          role="switch"
          aria-checked={settings.readAloud}
          onClick={() => set({ readAloud: !settings.readAloud })}
          className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-card border border-card-edge bg-surface-card px-5 py-3 text-left font-semibold shadow-card ${TAPPABLE_CARD}`}
        >
          Read questions aloud
          <SwitchTrack on={settings.readAloud} />
        </button>
      </div>
      <fieldset className="mt-6">
        <legend className="mb-2 font-semibold">Reading speed</legend>
        <div className="flex flex-wrap gap-2">
          {READING_SPEEDS.map((s) => (
            <Choice
              key={s}
              on={settings.readingSpeed === s}
              onClick={() => set({ readingSpeed: s })}
            >
              {SPEED_LABEL[s]}
            </Choice>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

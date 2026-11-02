"use client";

import { CARD_COLORS, FONT_IDS, type FontId } from "@/shared/enums";
import {
  LETTER_SPACING_STEPS,
  LINE_SPACING_STEPS,
  TEXT_SIZE_STEPS,
} from "@/shared/constants";
import { DEFAULT_SETTINGS, type Settings } from "@/shared/settings";
import { ReadingCard } from "@/ui/reading-card/ReadingCard";
import { useSettings } from "../SettingsProvider";
import { buttonClass } from "@/ui/button/button-class";

const FONT_LABEL: Record<FontId, string> = {
  atkinson: "Atkinson Hyperlegible Next",
  lexend: "Lexend",
  system: "System Sans",
};
const COLOR_LABEL = (c: string) => c[0].toUpperCase() + c.slice(1);

const READING_KEYS = ["font", "textSize", "letterSpacing", "lineSpacing", "cardColor"] as const;

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 rounded-full px-5 font-semibold ${
        on ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
      }`}
    >
      {children}
    </button>
  );
}

/** Reading settings (T1, T4): choices on the left, live preview on the right. Changes apply at once and save. */
export function ReadingSettings() {
  const { settings, update } = useSettings();
  const set = (patch: Partial<Settings>) => update(patch).catch(() => {});
  const reset = () => set(Object.fromEntries(READING_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])));

  return (
    <section aria-labelledby="reading-h" className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 id="reading-h" className="text-2xl font-semibold">
          Reading
        </h2>
        <Group label="Font">
          {FONT_IDS.map((f) => (
            <Choice key={f} on={settings.font === f} onClick={() => set({ font: f })}>
              {FONT_LABEL[f]}
            </Choice>
          ))}
        </Group>
        <Group label="Text size">
          {TEXT_SIZE_STEPS.map((s, i) => (
            <Choice key={s.label} on={settings.textSize === i + 1} onClick={() => set({ textSize: i + 1 })}>
              {s.label}
            </Choice>
          ))}
        </Group>
        <Group label="Letter spacing">
          {LETTER_SPACING_STEPS.map((s, i) => (
            <Choice key={s.label} on={settings.letterSpacing === i + 1} onClick={() => set({ letterSpacing: i + 1 })}>
              {s.label}
            </Choice>
          ))}
        </Group>
        <Group label="Line spacing">
          {LINE_SPACING_STEPS.map((s, i) => (
            <Choice key={s.label} on={settings.lineSpacing === i + 1} onClick={() => set({ lineSpacing: i + 1 })}>
              {s.label}
            </Choice>
          ))}
        </Group>
        <Group label="Card colour">
          {CARD_COLORS.map((c) => (
            <Choice key={c} on={settings.cardColor === c} onClick={() => set({ cardColor: c })}>
              {COLOR_LABEL(c)}
            </Choice>
          ))}
        </Group>
        <button
          type="button"
          onClick={reset}
          className={buttonClass("secondary", { extra: "mt-8" })}
        >
          Reset to defaults
        </button>
      </div>
      <div>
        <h2 className="text-2xl font-semibold">Preview</h2>
        <div className="mt-4">
          <ReadingCard
            settings={settings}
            question="Why use a cache?"
            answer={["Faster reads", "Less load on the database"]}
          />
        </div>
      </div>
    </section>
  );
}

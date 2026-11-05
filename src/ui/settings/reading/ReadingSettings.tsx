"use client";

import { CARD_COLORS, FONT_IDS, type FontId } from "@/shared/enums";
import { LETTER_SPACING_STEPS, LINE_SPACING_STEPS, TEXT_SIZE_STEPS } from "@/shared/constants";
import { DEFAULT_SETTINGS, type Settings } from "@/shared/settings";
import { FrontHint, PracticeFront } from "@/ui/reading-card/ReadingCard";
import { Icon } from "@/ui/icons/Icon";
import { iconButton } from "@/ui/practice/PracticeView";
import { Choice } from "../Choice";
import { useSettings } from "../SettingsProvider";
import { buttonClass, FOCUS_RING, PRESSED } from "@/ui/button/button-class";

const FONT_LABEL: Record<FontId, string> = {
  atkinson: "Atkinson Hyperlegible Next",
  lexend: "Lexend",
  system: "System Sans",
};
const SWATCH: Record<string, string> = {
  mist: "bg-card-mist",
  cream: "bg-card-cream",
  peach: "bg-card-peach",
  sage: "bg-card-sage",
  lavender: "bg-card-lavender",
  night: "bg-card-night",
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

/** Reading settings (T1, T4): choices on the left, live preview on the right. Changes apply at once and save. */
export function ReadingSettings() {
  const { settings, update } = useSettings();
  const set = (patch: Partial<Settings>) => update(patch).catch(() => {});
  const reset = () => set(Object.fromEntries(READING_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])));

  return (
    <section
      aria-labelledby="reading-h"
      className="grid gap-8 rounded-card border border-card-edge bg-surface-card p-6 shadow-card md:p-8 lg:grid-cols-2"
    >
      <div>
        <h2 id="reading-h" className="text-headline-md font-semibold">
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
            <Choice
              key={s.label}
              on={settings.textSize === i + 1}
              onClick={() => set({ textSize: i + 1 })}
            >
              {s.label}
            </Choice>
          ))}
        </Group>
        <Group label="Letter spacing">
          {LETTER_SPACING_STEPS.map((s, i) => (
            <Choice
              key={s.label}
              on={settings.letterSpacing === i + 1}
              onClick={() => set({ letterSpacing: i + 1 })}
            >
              {s.label}
            </Choice>
          ))}
        </Group>
        <Group label="Line spacing">
          {LINE_SPACING_STEPS.map((s, i) => (
            <Choice
              key={s.label}
              on={settings.lineSpacing === i + 1}
              onClick={() => set({ lineSpacing: i + 1 })}
            >
              {s.label}
            </Choice>
          ))}
        </Group>
        <Group label="Card colour">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={settings.cardColor === c}
              onClick={() => set({ cardColor: c })}
              className={`flex min-h-11 flex-col items-center gap-1 rounded-2xl px-2 py-1 hover:bg-surface-container-high active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className={`size-11 rounded-full outline outline-1 outline-outline-variant ${SWATCH[c]} ${
                  settings.cardColor === c ? "outline-4 outline-primary" : ""
                }`}
              />
              <span
                className={`text-label-md ${settings.cardColor === c ? "font-semibold text-primary" : "text-on-surface-variant"}`}
              >
                {COLOR_LABEL(c)}
              </span>
            </button>
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
        <h2 className="text-headline-md font-semibold">Preview</h2>
        <div className="mt-4">
          <PracticeFront
            data-testid="reading-card"
            settings={settings}
            topic="Caching"
            question="Why use a cache?"
            readAloud={
              <span aria-hidden="true" className={iconButton}>
                <Icon name="volume" />
              </span>
            }
          />
          <div className="mt-4">
            <FrontHint />
          </div>
        </div>
      </div>
    </section>
  );
}

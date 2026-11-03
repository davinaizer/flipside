import type { CSSProperties } from "react";
import {
  LETTER_SPACING_STEPS,
  LINE_SPACING_STEPS,
  QUESTION_SCALE,
  TEXT_SIZE_STEPS,
} from "@/shared/constants";
import type { Settings } from "@/shared/settings";
import { FONT_FAMILY } from "@/ui/font-ids";

export type ReadingSettings = Pick<
  Settings,
  "font" | "textSize" | "letterSpacing" | "lineSpacing" | "cardColor"
>;

/** Inline style for card text only; the page chrome never takes these. */
export function readingStyle(s: ReadingSettings): CSSProperties {
  return {
    fontFamily: FONT_FAMILY[s.font],
    fontSize: `${TEXT_SIZE_STEPS[s.textSize - 1].px}px`,
    letterSpacing: `${LETTER_SPACING_STEPS[s.letterSpacing - 1].em}em`,
    lineHeight: LINE_SPACING_STEPS[s.lineSpacing - 1].lineHeight,
    backgroundColor: `var(--card-${s.cardColor})`,
    color: `var(--on-card-${s.cardColor})`,
  };
}

/** Card face shared by the settings preview and Practice: left-aligned text on a plain card colour. */
export function ReadingCard({
  settings,
  question,
  answer,
}: {
  settings: ReadingSettings;
  question: string;
  answer: string[];
}) {
  return (
    <div
      data-testid="reading-card"
      className="rounded-3xl p-8 shadow-card text-left"
      style={readingStyle(settings)}
    >
      <p className="font-semibold" style={{ fontSize: `${QUESTION_SCALE}em` }}>
        {question}
      </p>
      <ul className="mt-4 list-disc pl-6">
        {answer.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

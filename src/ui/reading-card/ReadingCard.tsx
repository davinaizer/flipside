import type { CSSProperties, ReactNode } from "react";
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

export function Chip({ topic }: { topic: string }) {
  return (
    <span className="inline-block rounded-full bg-secondary-container px-4 py-1 text-sm font-semibold text-on-secondary-container">
      {topic}
    </span>
  );
}

export function QuestionLabel() {
  return <p className="mt-4 text-label-md font-semibold uppercase opacity-70">Question</p>;
}

/**
 * Front of a practice card, used by the Settings preview (T8): topic chip, Question label, question,
 * the read-aloud button and the footer hint, left-aligned on the card colour.
 */
export function ReadingCard({
  settings,
  topic,
  question,
  readAloud,
  hint,
}: {
  settings: ReadingSettings;
  topic: string;
  question: string;
  readAloud?: ReactNode;
  hint: string;
}) {
  return (
    <div
      data-testid="reading-card"
      className="rounded-3xl p-8 shadow-card text-left"
      style={readingStyle(settings)}
    >
      <div className="flex items-start justify-between gap-3">
        <Chip topic={topic} />
        {readAloud}
      </div>
      <QuestionLabel />
      <p className="mt-1 font-semibold" style={{ fontSize: `${QUESTION_SCALE}em` }}>
        {question}
      </p>
      <p className="mt-6 text-body-sm opacity-80">{hint}</p>
    </div>
  );
}

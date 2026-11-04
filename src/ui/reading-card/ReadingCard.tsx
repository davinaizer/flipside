import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
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

export const FRONT_HINT = "Say your answer out loud first, then show it.";

/**
 * The front face of a practice card (T8), the one component rendered by PracticeView and the Settings
 * preview: chip with the read-aloud slot on its right, Question label, question, optional image, then
 * the flip hint, all inside the card box on the reading-settings colour. Extra props (data-face, inert,
 * aria-hidden, data-testid) go on the box.
 */
export function PracticeFront({
  settings,
  topic,
  question,
  questionAs: Question = "p",
  image,
  readAloud,
  ...boxProps
}: {
  settings: ReadingSettings;
  topic: string;
  question: string;
  questionAs?: "h1" | "p";
  image?: ReactNode;
  readAloud?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "style" | "children"> & { inert?: boolean; "data-face"?: string; "data-testid"?: string }) {
  return (
    <div {...boxProps} className="flip-face text-left" style={readingStyle(settings)}>
      <div className="flex items-start justify-between gap-3">
        <Chip topic={topic} />
        {readAloud}
      </div>
      <QuestionLabel />
      <Question className="mt-1 font-semibold" style={{ fontSize: `${QUESTION_SCALE}em` }}>
        {question}
      </Question>
      {image}
      <p className="mt-6 text-body-sm opacity-80">{FRONT_HINT}</p>
    </div>
  );
}

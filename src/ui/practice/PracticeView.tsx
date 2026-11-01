import type { ReactNode } from "react";
import { bulletLines } from "@/domain/csv-import";
import { QUESTION_SCALE } from "@/shared/constants";
import type { SessionCardPayload } from "@/shared/schemas/session";
import { readingStyle, type ReadingSettings } from "@/ui/reading-card/ReadingCard";

export const FRONT_HINT = "Say your answer out loud first, then show it.";

/** Card text is always rendered as React text children, so HTML in a card shows literally. */
function CardImage({ image }: { image: NonNullable<SessionCardPayload["frontImage"]> }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by our own images API, already stored at its final size
    <img
      src={image.url}
      alt=""
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      className="mt-4 max-h-72 w-auto max-w-full rounded-2xl"
    />
  );
}

/** Segmented bar: done, current and remaining are told apart by colour and by the "Card N of M" text. */
export function SessionProgress({ done, total }: { done: number; total: number }) {
  const current = Math.min(done + 1, total);
  return (
    <div className="w-full">
      <p className="text-center text-sm text-on-surface-variant">
        Card {current} of {total}
      </p>
      <div
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} done of ${total}`}
        className="mt-2 flex gap-2"
      >
        {Array.from({ length: total }, (_, i) => {
          const state = i < done ? "done" : i === done ? "current" : "remaining";
          const colour =
            state === "done" ? "bg-primary-container" : state === "current" ? "bg-primary" : "bg-surface-container-high";
          return <div key={i} data-segment={state} className={`h-2 flex-1 rounded-full ${colour}`} />;
        })}
      </div>
    </div>
  );
}

function Answer({ card }: { card: SessionCardPayload }) {
  const lines = bulletLines(card.back, card.answerStyle);
  return lines ? (
    <ul className="mt-4 list-disc pl-6">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  ) : (
    <p className="mt-4 whitespace-pre-line">{card.back}</p>
  );
}

/**
 * One card of Practice, full screen (no sidebar). The front shows the chip, question, optional
 * image and hint; the back shrinks the question and shows the answer in the deck's style.
 * Reading settings style the card text only, never the surrounding chrome.
 */
export function PracticeView({
  card,
  revealed,
  done,
  total,
  settings,
  onReveal,
  footer,
}: {
  card: SessionCardPayload;
  revealed: boolean;
  done: number;
  total: number;
  settings: ReadingSettings;
  onReveal: () => void;
  /** Grade buttons on the back; the session controls (Undo, End) sit under them. */
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <SessionProgress done={done} total={total} />
      <article data-testid="practice-card" className="rounded-3xl p-8 text-left" style={readingStyle(settings)}>
        <span className="inline-block rounded-full bg-primary-container px-4 py-1 text-sm font-semibold text-on-primary-container">
          {card.topic}
        </span>
        {revealed ? (
          <>
            <p data-testid="question-small" className="mt-4 font-medium opacity-80">
              {card.front}
            </p>
            <hr className="my-4 border-current opacity-20" />
            <Answer card={card} />
            {card.backImage && <CardImage image={card.backImage} />}
          </>
        ) : (
          <>
            <h1 className="mt-4 font-semibold" style={{ fontSize: `${QUESTION_SCALE}em` }}>
              {card.front}
            </h1>
            {card.frontImage && <CardImage image={card.frontImage} />}
            <p className="mt-6 opacity-80">{FRONT_HINT}</p>
          </>
        )}
      </article>
      {!revealed && (
        <button
          type="button"
          onClick={onReveal}
          className="min-h-14 self-center rounded-full bg-primary px-10 text-on-primary"
        >
          Show answer
        </button>
      )}
      {footer}
    </div>
  );
}

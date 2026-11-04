import type { ReactNode } from "react";
import { bulletLines } from "@/domain/csv-import";
import { Icon } from "@/ui/icons/Icon";
import { QUESTION_SCALE } from "@/shared/constants";
import type { SessionCardPayload } from "@/shared/schemas/session";
import { textToRead, type Reader } from "./speech";
import { readingStyle, type ReadingSettings } from "@/ui/reading-card/ReadingCard";
import { buttonClass, FOCUS_RING, PRESSED } from "@/ui/button/button-class";

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

/** Deck name and "Card N of M": the text count that backs up the bar, so colour is never the only signal. */
export function SessionCount({ deckName, done, total }: { deckName?: string; done: number; total: number }) {
  const current = Math.min(done + 1, total);
  return (
    <p className="flex min-h-11 items-center gap-2 rounded-full border border-card-edge bg-surface-card px-5 shadow-card">
      {deckName && <span className="font-semibold text-on-surface">{deckName}</span>}
      <span className="text-body-sm text-on-surface-variant">
        Card {current} of {total}
      </span>
    </p>
  );
}

/** Segmented bar: done, current and remaining are told apart by colour and by the "Card N of M" text. */
export function SessionProgress({ done, total }: { done: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Session progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} done of ${total}`}
      className="flex w-full gap-2"
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i < done ? "done" : i === done ? "current" : "remaining";
        const colour =
          state === "done" ? "bg-primary-container" : state === "current" ? "bg-primary" : "bg-surface-container-high";
        return <div key={i} data-segment={state} className={`h-2 flex-1 rounded-full ${colour}`} />;
      })}
    </div>
  );
}

export const iconButton =
  `flex size-11 items-center justify-center rounded-full border border-card-edge bg-surface-card text-on-surface-variant shadow-card hover:text-primary active:bg-surface-container-high ${PRESSED} ${FOCUS_RING}`;

function Chip({ topic }: { topic: string }) {
  return (
    <span className="inline-block rounded-full bg-secondary-container px-4 py-1 text-sm font-semibold text-on-secondary-container">
      {topic}
    </span>
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
  reader,
  footer,
  headerAction,
  onEnd,
}: {
  card: SessionCardPayload;
  revealed: boolean;
  done: number;
  total: number;
  settings: ReadingSettings;
  onReveal: () => void;
  /** Absent when the browser cannot speak: the Read aloud button is then hidden. */
  reader?: Reader | null;
  /** Grade buttons on the back; the session controls (Undo, End) sit under them. */
  footer?: ReactNode;
  /** Top bar shortcut on the right, e.g. reading settings. */
  headerAction?: ReactNode;
  /** Leaves the session; the End session pill in the top bar is shown only when this is given. */
  onEnd?: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          {onEnd && (
            <button type="button" onClick={onEnd} className={buttonClass("secondary", { size: "compact" })}>
              <Icon name="x" />
              End session
            </button>
          )}
        </div>
        <SessionCount deckName={card.deckName} done={done} total={total} />
        <div className="flex items-center justify-end gap-2">
          {reader && (
            <button
              type="button"
              aria-label={revealed ? "Read answer aloud" : "Read question aloud"}
              onClick={() => reader.speak(textToRead(card, revealed))}
              className={iconButton}
            >
              <Icon name="volume" />
            </button>
          )}
          {headerAction}
        </div>
      </header>
      <SessionProgress done={done} total={total} />
      {/* Both faces always render and the wrapper rotates, so the flip is a CSS transition on reveal only.
          The key remounts per card: a new card starts unrotated and never animates. Tapping the front reveals. */}
      <div key={card.cardId} className="flip-scene" onClick={revealed ? undefined : onReveal}>
        <article data-testid="practice-card" data-revealed={revealed} className="flip-card">
          <div
            data-face="front"
            aria-hidden={revealed}
            inert={revealed}
            className="flip-face text-left"
            style={readingStyle(settings)}
          >
            <Chip topic={card.topic} />
            <h1 className="mt-4 font-semibold" style={{ fontSize: `${QUESTION_SCALE}em` }}>
              {card.front}
            </h1>
            {card.frontImage && <CardImage image={card.frontImage} />}
          </div>
          <div
            data-face="back"
            aria-hidden={!revealed}
            inert={!revealed}
            className="flip-face flip-back text-left"
            style={readingStyle(settings)}
          >
            <Chip topic={card.topic} />
            <p data-testid="question-small" className="mt-4 font-medium opacity-80">
              {card.front}
            </p>
            <hr className="my-4 border-current opacity-20" />
            <Answer card={card} />
            {card.backImage && <CardImage image={card.backImage} />}
          </div>
        </article>
      </div>
      {!revealed && (
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={onReveal} className={buttonClass("primary", { size: "large" })}>
            <Icon name="eye" />
            Show answer
          </button>
          <p className="text-center text-body-sm text-on-surface-variant">{FRONT_HINT}</p>
        </div>
      )}
      {footer}
    </div>
  );
}

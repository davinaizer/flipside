import { useEffect, useMemo } from "react";
import type { ReadingSpeed } from "@/shared/enums";

/** speechSynthesis rate per reading speed (1 is the browser's normal voice speed). */
export const SPEECH_RATES: Record<ReadingSpeed, number> = { slow: 0.75, normal: 1, fast: 1.3 };

export type Synth = Pick<SpeechSynthesis, "speak" | "cancel">;
type Utter = (text: string) => SpeechSynthesisUtterance;

export type Reader = { speak: (text: string) => void; cancel: () => void };

/** Speaks one text at a time: a new text or cancel() cuts the previous one off. */
export function createReader(synth: Synth, speed: ReadingSpeed, utter: Utter = (t) => new SpeechSynthesisUtterance(t)): Reader {
  return {
    speak(text) {
      synth.cancel();
      const u = utter(text);
      u.rate = SPEECH_RATES[speed];
      synth.speak(u);
    },
    cancel: () => synth.cancel(),
  };
}

/** Null when the browser has no speech synthesis, so callers hide the button without an error. */
export function browserSynth(): Synth | null {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"
    ? window.speechSynthesis
    : null;
}

/** Question on the front, answer on the back. */
export function textToRead(card: { front: string; back: string }, revealed: boolean): string {
  return revealed ? card.back : card.front;
}

/**
 * Auto-read speaks the question when a new card appears (not when it is revealed).
 * Leaving the card or the screen cancels speech.
 */
export function useReadAloud(cardId: string | undefined, front: string | undefined, autoRead: boolean, speed: ReadingSpeed) {
  const reader = useMemo(() => {
    const synth = browserSynth();
    return synth ? createReader(synth, speed) : null;
  }, [speed]);

  useEffect(() => {
    if (!reader || !autoRead || cardId === undefined || front === undefined) return;
    reader.speak(front);
    return () => reader.cancel();
    // front is read with the card id: it only changes together with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader, autoRead, cardId]);

  useEffect(() => () => reader?.cancel(), [reader]);
  return reader;
}

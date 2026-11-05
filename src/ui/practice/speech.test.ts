import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { SessionCardPayload } from "@/shared/schemas/session";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { PracticeView } from "./PracticeView";
import { browserSynth, createReader, SPEECH_RATES, textToRead } from "./speech";

const card = { front: "Q?", back: "A!" };
const mock = () => {
  const spoken: { text: string; rate: number }[] = [];
  const synth = {
    speak: vi.fn((u: SpeechSynthesisUtterance) => spoken.push({ text: u.text, rate: u.rate })),
    cancel: vi.fn(),
  };
  const utter = (text: string) => ({ text, rate: 1 }) as SpeechSynthesisUtterance;
  return { synth, spoken, utter };
};

test("speaks the question on the front and the answer on the back", () => {
  const { synth, spoken, utter } = mock();
  const r = createReader(synth, "normal", utter);
  r.speak(textToRead(card, false));
  r.speak(textToRead(card, true));
  expect(spoken.map((s) => s.text)).toEqual(["Q?", "A!"]);
  expect(synth.cancel).toHaveBeenCalledTimes(2); // each new text cuts off the previous one
});

test("Slow, Normal and Fast map to rates", () => {
  expect(SPEECH_RATES.slow).toBeLessThan(SPEECH_RATES.normal);
  expect(SPEECH_RATES.fast).toBeGreaterThan(SPEECH_RATES.normal);
  for (const speed of ["slow", "normal", "fast"] as const) {
    const { synth, spoken, utter } = mock();
    createReader(synth, speed, utter).speak("x");
    expect(spoken[0].rate).toBe(SPEECH_RATES[speed]);
  }
});

test("cancel stops speech", () => {
  const { synth, utter } = mock();
  createReader(synth, "fast", utter).cancel();
  expect(synth.cancel).toHaveBeenCalledTimes(1);
});

test("an unsupported browser gives no synth, and the view hides the button", () => {
  expect(browserSynth()).toBeNull(); // node: no window
  const payload = {
    cardId: "c",
    deckId: "d",
    deckName: "D",
    answerStyle: "paragraph",
    topic: "T",
    front: "Q?",
    back: "A!",
    frontImage: null,
    backImage: null,
    labels: { not_yet: "a", nearly: "b", got_it: "c" },
  } as SessionCardPayload;
  const html = (reader: ReturnType<typeof createReader> | null, revealed: boolean) =>
    renderToStaticMarkup(
      createElement(PracticeView, {
        card: payload,
        revealed,
        done: 0,
        total: 1,
        settings: DEFAULT_SETTINGS,
        onReveal: () => {},
        reader,
      }),
    );
  expect(html(null, false)).not.toContain("aloud");
  const reader = createReader(mock().synth, "normal");
  expect(html(reader, false)).toContain("Read question aloud");
  expect(html(reader, true)).toContain("Read answer aloud");
});

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { GradeBar } from "./GradeBar";

const labels = { not_yet: "Tomorrow", nearly: "In 3 days", got_it: "In a week" };
const noop = () => {};

test("grade buttons and Try again have hover, pressed and focus classes", () => {
  const html = renderToStaticMarkup(<GradeBar labels={labels} busy={false} failed onGrade={noop} onRetry={noop} />);
  const buttons = html.match(/<button[^>]*>/g) ?? [];
  expect(buttons).toHaveLength(4);
  for (const b of buttons) {
    expect(b).toContain("hover:");
    expect(b).toContain("active:");
    expect(b).toContain(PRESSED);
    expect(b).toContain(FOCUS_RING);
  }
});

test("prompt renders directly above the grade buttons and labels the group", () => {
  const html = renderToStaticMarkup(<GradeBar labels={labels} busy={false} failed={false} onGrade={noop} onRetry={noop} />);
  expect(html).toMatch(/<p id="grade-prompt"[^>]*>How well did you know this\?<\/p><div role="group" aria-labelledby="grade-prompt"/);
});

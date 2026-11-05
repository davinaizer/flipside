import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { BAR_HEIGHT, MasteryBar } from "./MasteryBar";

test("the bar is thin and the legend is unchanged", () => {
  const html = renderToStaticMarkup(
    <MasteryBar mastery={{ new: 1, notYet: 2, nearly: 3, gotIt: 4 }} />,
  );
  expect(BAR_HEIGHT).toBe("h-1.5");
  expect(html).toContain(`flex ${BAR_HEIGHT} w-full`);
  expect(html).not.toContain("flex h-3 w-full");
  for (const t of ["New 1", "Not yet 2", "Nearly 3", "Got it 4"]) expect(html).toContain(t);
});

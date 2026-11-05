import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { strToU8 } from "fflate";
import { expect, test } from "vitest";
import { buildPreview, parseImportFile } from "@/domain/import-file";
import { ImportFlow } from "./ImportFlow";
import { ImportBlocked, ImportPreview } from "./ImportPreview";
import { ImportSuccess } from "./ImportSuccess";

const csv = [
  "id,topic,front,back,extra",
  "a1,T1,Q1,A1,x",
  "a2,T1,Q2,A2,x",
  "a3,T2,Q3,A3,x",
  "a4,T2,Q4,A4,x",
  "a4,T2,Q5,A5,x",
  "a6,T2,,A6,x",
].join("\n");

test("the browser preview shows columns, counts, three cards, and issues by row", async () => {
  const parsed = await parseImportFile(strToU8(csv));
  if (!parsed.ok) throw new Error("expected a preview");
  const html = renderToStaticMarkup(
    createElement(ImportPreview, { preview: buildPreview(parsed), fileName: "d.csv" }),
  );
  expect(html).toContain("4 cards ready, 6 rows read, 2 skipped");
  expect(html).toContain("Columns found: id, topic, front, back");
  expect(html).toContain("Ignored: extra");
  expect(html).toContain("Q1");
  expect(html).toContain("Q3");
  expect(html).not.toContain("Q4");
  expect(html).toMatch(/Row 6: /);
  expect(html).toMatch(/Row 7: /);
});

test("a blocked file lists why and says nothing was saved", async () => {
  const parsed = await parseImportFile(strToU8("topic,front\nT,Q"));
  if (parsed.ok) throw new Error("expected blocked");
  const html = renderToStaticMarkup(createElement(ImportBlocked, { issues: parsed.issues }));
  expect(html).toContain("This file cannot be imported");
  expect(html).toContain("Nothing was saved");
});

test("success names the deck with added and updated counts and two actions", () => {
  const html = renderToStaticMarkup(
    createElement(ImportSuccess, {
      deckName: "Biology",
      result: {
        deckId: "d1",
        added: 3,
        updated: 1,
        unchanged: 0,
        skipped: 0,
        missing: [],
        imageCount: 0,
        warnings: [],
      },
    }),
  );
  expect(html).toContain("Saved to Biology");
  expect(html).toContain("3 cards added, 1 updated, 0 unchanged");
  expect(html).toContain('href="/decks/d1"');
  expect(html).toContain('href="/library"');
  // Visible text only: the icons carry an SVG viewBox attribute.
  expect(html.replace(/<[^>]*>/g, " ")).not.toMatch(/box|leitner/i);
});

test("success on re-import shows unchanged, missing ids kept, and commit warnings", () => {
  const html = renderToStaticMarkup(
    createElement(ImportSuccess, {
      deckName: "Biology",
      result: {
        deckId: "d1",
        added: 0,
        updated: 2,
        unchanged: 5,
        skipped: 0,
        missing: ["a9", "b3"],
        imageCount: 0,
        warnings: [
          {
            severity: "warning",
            code: "missing_image",
            row: 4,
            message: "Image x.png was not supplied",
          },
          {
            severity: "warning",
            code: "card_not_in_file",
            message: "Card a9 is in the deck but not in the file; it was kept",
          },
        ],
      },
    }),
  );
  expect(html).toContain("2 updated, 5 unchanged");
  expect(html).toContain("a9, b3");
  expect(html).toContain("Row 4: Image x.png was not supplied");
  expect(html).not.toContain("is in the deck but not in the file");
});

test("the flow starts at file choice with the template link", () => {
  const html = renderToStaticMarkup(
    createElement(ImportFlow, { decks: [{ id: "d1", name: "Biology" }], initialDeckId: "d1" }),
  );
  expect(html).toContain("Choose CSV or zip");
  expect(html).toContain('href="/api/v1/imports/template"');
});

test("?deckId preselects the re-import target, and an unknown id is ignored", () => {
  const decks = [{ id: "d1", name: "Biology" }];
  expect(renderToStaticMarkup(createElement(ImportFlow, { decks, initialDeckId: "d1" }))).toContain(
    "Updating Biology",
  );
  expect(
    renderToStaticMarkup(createElement(ImportFlow, { decks, initialDeckId: "nope" })),
  ).not.toContain("Updating");
});

test("ImportFlow is one column: no lg grid classes, sections in order 1, 2, 3", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./ImportFlow.tsx", import.meta.url), "utf8");
  expect(src).not.toMatch(/\blg:|grid-cols/);
  const at = (s: string) => src.indexOf(s);
  expect(at('aria-label="Choose file"')).toBeGreaterThan(-1);
  expect(at('aria-label="Choose file"')).toBeLessThan(at("<ImportPreview"));
  expect(at("<ImportPreview")).toBeLessThan(at('aria-label="Deck details"'));
  const preview = readFileSync(new URL("./ImportPreview.tsx", import.meta.url), "utf8");
  expect(preview).toContain('title="Check the cards"');
});

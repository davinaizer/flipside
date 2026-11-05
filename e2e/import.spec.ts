import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme, test } from "./helpers";

const zipBytes = readFileSync(join(process.cwd(), "fixtures/science-w2-deck.zip"));

/** The school zip with one card's back text changed, so a re-import updates exactly that card. */
function editedZip(): Buffer {
  const files = unzipSync(new Uint8Array(zipBytes));
  const csvKey = Object.keys(files).find((k) => k.endsWith(".csv"))!;
  const csv = strFromU8(files[csvKey]);
  expect(csv).toContain("Bubbling");
  files[csvKey] = strToU8(csv.replace("Bubbling", "Bubbling and fizzing"));
  return Buffer.from(zipSync(files));
}

async function checkBothThemes(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

async function openImport(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name }).click();
  await page.waitForURL("**/library");
  await page.goto("/import");
}

async function pick(page: Page, name: string, buffer: Buffer, mimeType: string) {
  // Choosing before React hydrates would drop the change event.
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer });
}

test("import the school zip, re-import it unchanged, then an edited back", async ({
  page,
}, info) => {
  const deck = `Science week 2 ${info.project.name}`;
  await openImport(page, info.project.name === "desktop" ? "Davi" : "Nicole");
  await checkBothThemes(page); // choose step

  await pick(page, "science-w2-deck.zip", zipBytes, "application/zip");
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview).toContainText("16 cards ready");
  await expect(preview).toContainText("7 images");
  await checkBothThemes(page); // preview step

  await page.getByLabel("Deck name").fill(deck);
  await page.getByRole("button", { name: /^Add \d+ cards?$/ }).click();
  await expect(page.getByRole("status")).toContainText(`Saved to ${deck}`);
  await expect(page.getByRole("status")).toContainText("16 cards added, 0 updated");
  await checkBothThemes(page); // success step
  const deckHref = await page.getByRole("link", { name: "Open deck" }).getAttribute("href");

  // Same file again into the same deck: nothing added.
  await page.goto(`/import?deckId=${deckHref!.split("/").pop()}`);
  await pick(page, "science-w2-deck.zip", zipBytes, "application/zip");
  await expect(page.getByRole("region", { name: "Preview" })).toContainText("16 cards ready");
  await expect(page.getByLabel("Add to")).toHaveValue(deckHref!.split("/").pop()!);
  await page.getByRole("button", { name: "Update deck" }).click();
  await expect(page.getByRole("status")).toContainText("0 cards added, 0 updated");

  // Edited back: one card updated.
  await page.goto(`/import?deckId=${deckHref!.split("/").pop()}`);
  await pick(page, "science-w2-deck.zip", editedZip(), "application/zip");
  await page.getByRole("button", { name: "Update deck" }).click();
  await expect(page.getByRole("status")).toContainText("0 cards added, 1 updated");
});

test("a broken CSV shows its row errors and a blocked file explains itself", async ({
  page,
}, info) => {
  await openImport(page, info.project.name === "desktop" ? "Davi" : "Nicole");
  const csv = Buffer.from("id,topic,front,back\na,T,Q,A\nb,T,   ,A2\n");
  await pick(page, "broken.csv", csv, "text/csv");
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview).toContainText("1 card ready");
  await expect(preview.getByRole("region", { name: "Errors" })).toContainText("Row 3");
  await checkBothThemes(page);

  await pick(page, "missing.csv", Buffer.from("id,topic,front\na,T,Q\n"), "text/csv");
  await expect(page.getByRole("heading", { name: "This file cannot be imported" })).toBeVisible();
  await checkBothThemes(page);
});

test("import is one column, sections 1 Choose file, 2 Preview, 3 Deck details, at every width (I7)", async ({
  page,
}, info) => {
  await openImport(page, info.project.name === "desktop" ? "Davi" : "Nicole");
  await pick(page, "science-w2-deck.zip", zipBytes, "application/zip");
  await expect(page.getByRole("region", { name: "Deck details" })).toBeVisible();
  const sizes = info.project.name === "ipad" ? [null, { width: 820, height: 1180 }] : [null];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    const boxes = [];
    for (const name of ["Choose file", "Preview", "Deck details"]) {
      boxes.push((await page.getByRole("region", { name, exact: true }).boundingBox())!);
    }
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height - 1); // stacked, in order
      expect(Math.abs(boxes[i].x - boxes[0].x)).toBeLessThan(2); // one column
    }
    await checkBothThemes(page);
  }
});

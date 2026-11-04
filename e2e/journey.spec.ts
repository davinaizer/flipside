import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { test } from "./helpers";

const zip = readFileSync(join(process.cwd(), "fixtures/science-w2-deck.zip"));

// The whole MVP path on a production build (e2e-server runs next build and next start):
// pick a profile, import the school deck, practise, undo, finish, see statistics.
test("pick profile, import the school deck, practise, undo, finish, see statistics; nothing leaves the local host", async ({ page, baseURL }, info) => {
  const localHost = new URL(baseURL!).host;
  const outside: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith("http") && u.host !== localHost) outside.push(r.url());
  });

  await page.goto("/");
  await page.getByRole("button", { name: `Journey ${info.project.name}`, exact: true }).click();
  await page.waitForURL("**/library");

  await page.goto("/import");
  await page.waitForLoadState("networkidle"); // choosing before hydration would drop the change event
  await page.locator('input[type="file"]').setInputFiles({ name: "science-w2-deck.zip", mimeType: "application/zip", buffer: zip });
  await expect(page.getByRole("region", { name: "Preview" })).toContainText("16 cards ready");
  await page.getByLabel("Deck name").fill("Journey science");
  await page.getByRole("button", { name: /^Add \d+ cards?$/ }).click();
  await expect(page.getByRole("status")).toContainText("16 cards added");

  await page.goto("/library");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText("Card 1 of 5")).toBeVisible();

  const gradeCard = async (name: RegExp) => {
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name }).click();
  };
  await gradeCard(/^Got it/);
  await expect(page.getByText("Card 2 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Undo last" }).click();
  await expect(page.getByText("Card 1 of 5")).toBeVisible();
  await gradeCard(/^Got it/);
  await gradeCard(/^Nearly/);
  await gradeCard(/^Got it/);
  await gradeCard(/^Got it/);
  await gradeCard(/^Got it/);

  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByRole("listitem").filter({ hasText: "Cards reviewed" }).first()).toContainText("5");
  await expect(page.getByRole("region", { name: "By deck" })).toContainText("Journey science");

  expect(outside).toEqual([]);
});

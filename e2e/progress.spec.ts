import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

// Each scenario owns profiles that only e2e-seed.ts creates (see PROGRESS_CARDS there for the history).
// Hand-computed for the seeded history, all reviewed now: first attempts of 4, 6, 8 and 10 s graded
// got_it, got_it, nearly, not_yet. 4 reviewed, 2 of 4 = 50%, median (6 + 8) / 2 = 7 s, 1 day practised.
// Cells has boxes 1, 1, 4 (mastery 33%), Energy 4, 5, 5 (100%): 4 of 6 cards mastered.
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- API bodies read in assertions only

async function signIn(page: Page, scenario: string, info: TestInfo) {
  await page.goto("/");
  await page.getByRole("button", { name: `Progress ${scenario} ${info.project.name}`, exact: true }).click();
  await page.waitForURL("**/library");
  await page.goto("/progress");
}

const tile = (page: Page, label: string) => page.getByRole("listitem").filter({ hasText: label }).first();

async function checkBothThemes(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

test("the seeded history shows its hand-computed figures and Focus next opens a session; axe and 44 px pass in both themes", async ({ page }, info) => {
  await signIn(page, "main", info);
  await expect(tile(page, "Cards reviewed")).toContainText("4");
  await expect(tile(page, "Got it rate")).toContainText("50%");
  await expect(tile(page, "Time per card")).toContainText("7 s");
  await expect(tile(page, "Days practised")).toContainText("1 of 7");

  // Cells is the lowest-mastery topic, so it leads Focus next.
  const focus = page.getByRole("region", { name: "Focus next" });
  await expect(focus.getByRole("listitem").first()).toContainText("Cells");
  await expect(focus.getByRole("listitem").first()).toContainText("Mastery 33%");
  await expect(focus.getByRole("listitem").nth(1)).toContainText("Mastery 100%");

  const row = page.getByRole("region", { name: "By deck" }).getByRole("row", { name: /Progress science/ });
  await expect(row.getByRole("cell").nth(0)).toHaveText("6");
  await expect(row.getByRole("cell").nth(1)).toHaveText("4");
  await expect(row.getByRole("cell").nth(2)).toHaveText("7 s");

  await page.getByRole("button", { name: "This month" }).click();
  await expect(tile(page, "Days practised")).toContainText("1 of 28");
  await expect(tile(page, "Cards reviewed")).toContainText("4");
  await page.getByRole("button", { name: "This week" }).click();
  await expect(tile(page, "Days practised")).toContainText("1 of 7");

  await checkBothThemes(page);

  await page.getByRole("button", { name: "Practise Cells" }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText("Card 1 of 3")).toBeVisible();
});

test("undo removes a review's contribution from the statistics (AC6)", async ({ page }, info) => {
  await signIn(page, "undo", info);
  await expect(tile(page, "Cards reviewed")).toContainText("4");

  // Grade the one New card through the API, then undo it.
  const put = await page.request.put(`/api/v1/sessions/${crypto.randomUUID()}`, { data: { scope: { kind: "all" }, length: 5 } });
  expect(put.status()).toBe(200);
  const { session, queue } = (await put.json()) as Json;
  expect(queue).toHaveLength(1);
  const reviewId = crypto.randomUUID();
  const graded = await page.request.put(`/api/v1/reviews/${reviewId}`, {
    data: { sessionId: session.id, cardId: queue[0].cardId, grade: "got_it", durationMs: 2000 },
  });
  expect(graded.status()).toBe(200);
  await page.reload();
  await expect(tile(page, "Cards reviewed")).toContainText("5");
  await expect(tile(page, "Got it rate")).toContainText("60%");

  expect((await page.request.delete(`/api/v1/reviews/${reviewId}`)).status()).toBe(200);
  await page.reload();
  await expect(tile(page, "Cards reviewed")).toContainText("4");
  await expect(tile(page, "Got it rate")).toContainText("50%");
  await expect(tile(page, "Time per card")).toContainText("7 s");
});

test("a new profile sees the empty state, which passes axe and 44 px in both themes", async ({ page }, info) => {
  await signIn(page, "empty", info);
  await expect(page.getByRole("heading", { name: "Nothing to show yet" })).toBeVisible();
  await expect(page.getByText("Cards reviewed")).toHaveCount(0);
  await checkBothThemes(page);
});

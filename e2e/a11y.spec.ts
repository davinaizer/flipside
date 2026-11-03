import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

// AC12 and AC13: one walk over every screen and state in PRD section 8 (picker, Library, Deck, Import, Practice
// front/back/summary, Progress, Settings; empty, loading, error and success), axe plus 44 px in both themes, then the
// theme toggle on each screen, and reduced motion. It runs on desktop and iPad landscape, and the iPad project repeats the
// walk in portrait. Each project owns the "A11y <project>" profile that only e2e-seed.ts creates.
const zip = readFileSync(join(process.cwd(), "fixtures/science-w2-deck.zip"));

async function check(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

const darkSwitch = (page: Page) => page.getByRole("switch", { name: /Dark theme/ });

const todayZero = { dueCount: 0, startableCount: 0, decksWithDue: 0, sessionLength: 10, weakCount: 0 };

/** Mocked Library and Progress states (loading, error, empty); the real success states are walked by the caller. */
async function mockedStates(page: Page) {
  // loading: hold the response until axe has run
  let release!: () => void;
  const gate = new Promise<void>((res) => (release = res));
  await page.route("**/api/v1/library", async (r) => {
    await gate;
    await r.fulfill({ json: { today: todayZero, groups: [] } });
  });
  await page.goto("/library");
  await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();
  await check(page);
  release();
  await expect(page.getByRole("heading", { name: "No decks yet" })).toBeVisible(); // empty
  await check(page);
  await page.unroute("**/api/v1/library");

  for (const [path, url] of [["/library", "**/api/v1/library"], ["/progress", "**/api/v1/stats*"]] as const) {
    await page.route(url, (r) => r.abort()); // error
    await page.goto(path);
    await expect(page.getByRole("heading", { name: /home server/ })).toBeVisible();
    await check(page);
    await page.unroute(url);
  }
}

/** Screens that show real data once the profile has a deck and one graded card. */
async function successScreens(page: Page) {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await check(page);

  await page.getByRole("link", { name: /Science/ }).first().click();
  await page.waitForURL("**/decks/*");
  await expect(page.getByRole("heading", { name: /Science/ })).toBeVisible();
  await check(page);
  await page.goto("/decks/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "We can't find that deck" })).toBeVisible();
  await check(page);

  await page.goto("/progress");
  await expect(page.getByRole("listitem").filter({ hasText: "Cards reviewed" }).first()).toBeVisible();
  await check(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  await check(page);
  await page.goto("/import");
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await check(page);
}

async function practiceScreens(page: Page) {
  await page.goto("/library");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText("Card 1 of 5")).toBeVisible();
  await expect(darkSwitch(page)).toHaveCount(0); // F9.14: no switch on practice
  await check(page); // front
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByRole("button", { name: /^Got it/ })).toBeVisible();
  await expect(darkSwitch(page)).toHaveCount(0);
  await check(page); // back
  await page.getByRole("button", { name: /^Got it/ }).click();
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();
  await expect(darkSwitch(page)).toBeVisible();
  await check(page);
}

test("every screen and state passes axe and 44 px in both themes; toggle, reload, reduced motion; iPad portrait", async ({ page, browser }, info) => {
  // One walk over every screen in two themes: about 25 s on a laptop, so the 30 s default is too tight for CI.
  test.setTimeout(120_000);
  // Picker: no cookie yet.
  const fresh = await browser.newContext({ viewport: page.viewportSize() });
  const picker = await fresh.newPage();
  await picker.goto("/");
  await expect(picker.getByRole("button", { name: "Davi" })).toBeVisible();
  // AC16: the picker has the switch too; with no profile it only changes the theme on screen.
  await expect(darkSwitch(picker)).toBeVisible();
  await check(picker);
  await picker.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await darkSwitch(picker).click();
  await expect(picker.locator("html")).toHaveAttribute("data-theme", "dark");
  await fresh.close();

  await page.goto("/");
  await page.getByRole("button", { name: `A11y ${info.project.name}`, exact: true }).click();
  await page.waitForURL("**/library");

  // Import: form, preview, success.
  await page.goto("/import");
  await page.waitForLoadState("networkidle"); // choosing before hydration would drop the change event
  await check(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "science-w2-deck.zip", mimeType: "application/zip", buffer: zip });
  await expect(page.getByRole("region", { name: "Preview" })).toContainText("16 cards ready");
  await check(page);

  // Empty Progress needs a profile with no reviews, so it runs before the first grade.
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress" }).first()).toBeVisible();
  await check(page);

  await page.goto("/import");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="file"]').setInputFiles({ name: "science-w2-deck.zip", mimeType: "application/zip", buffer: zip });
  await expect(page.getByRole("region", { name: "Preview" })).toContainText("16 cards ready");
  await page.getByLabel("Deck name").fill("A11y Science");
  await page.getByRole("button", { name: /^Add \d+ cards?$/ }).click();
  await expect(page.getByRole("status")).toContainText("16 cards added");
  await check(page); // success

  await mockedStates(page);
  await practiceScreens(page);
  await successScreens(page);

  // AC13: the switch changes the theme at once on each screen and it survives a reload.
  for (const path of ["/library", "/progress", "/settings", "/import"]) {
    await page.goto(path);
    const html = page.locator("html");
    const toggle = page.getByRole("switch", { name: /Dark theme/ });
    await expect(html).toHaveAttribute("data-theme", "light");
    const saved = () => page.waitForResponse((r) => r.url().endsWith("/api/v1/settings") && r.request().method() === "PUT");
    let put = saved();
    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "dark"); // at once, before the save returns
    await put;
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    put = saved();
    await page.getByRole("switch", { name: /Dark theme/ }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await put;
  }

  // Reduced motion: the loading skeleton does not pulse.
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const gate = new Promise<void>((res) => (release = res));
  await page.route("**/api/v1/library", async (r) => {
    await gate;
    await r.continue();
  });
  await page.goto("/library");
  const skeleton = page.getByRole("status", { name: "Loading" }).locator("div").first();
  await expect(skeleton).toBeVisible();
  expect(await skeleton.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  release();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await page.unroute("**/api/v1/library");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // iPad portrait: the same screens, on the ipad project only.
  if (info.project.name === "ipad") {
    await page.setViewportSize({ width: 820, height: 1180 });
    await mockedStates(page);
    await practiceScreens(page);
    await successScreens(page);
  }
});

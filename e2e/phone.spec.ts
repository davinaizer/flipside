import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme, test } from "./helpers";

// W3: every screen in PRD section 8: login, picker, Library, Deck, practice, summary, Progress, Settings, Profile, Import at 375 x 812 through the existing responsive layout, in both themes. Read-only on
// the seeded Davi and Nicole profiles.

/** No horizontal page scroll, every control inside the viewport, axe and 44 px, in both themes. */
/** The sidebar starts expanded on the server and collapses after hydration; measure only once it has finished. */
async function shellSettled(page: Page) {
  await expect(page.getByRole("banner").getByRole("button", { name: "Sidebar" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  // The rail narrows over 200 ms; measuring mid-transition shows a false overflow.
  await expect
    .poll(() => page.getByRole("complementary").evaluate((el) => el.getBoundingClientRect().width))
    .toBe(80);
}

async function checkPhone(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBe(clientWidth);
    const outside = await page.$$eval(
      'a[href], button, input, select, textarea, [role="switch"], [role="button"]',
      (els, width) =>
        els
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.height > 0)
          .filter(({ r }) => r.left < 0 || r.right > width)
          .map(
            ({ el, r }) =>
              `${el.tagName.toLowerCase()} ${Math.round(r.left)}..${Math.round(r.right)}`,
          ),
      375,
    );
    expect(outside).toEqual([]);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

test("login fits the phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  await checkPhone(page);
  await context.close();
});

test("picker, Library and Deck fit the phone; sidebar collapse and profile menu work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Nicole" })).toBeVisible();
  await checkPhone(page);

  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await shellSettled(page);
  await checkPhone(page);

  // With no saved choice the sidebar starts as the icon rail at this width. Expanding it is the user's choice and
  // may overflow, so only the toggle is checked there; the profile menu opens from the rail.
  const aside = page.getByRole("complementary");
  const toggle = page.getByRole("banner").getByRole("button", { name: "Sidebar" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await aside.getByRole("button", { name: "Davi" }).click();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await checkPhone(page);
  await page.keyboard.press("Escape");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("link", { name: /Davi (Science|Biology)/ }).click();
  await page.waitForURL("**/decks/*");
  await expect(page.getByRole("heading", { name: /Davi (Science|Biology)/ })).toBeVisible();
  await checkPhone(page);
});

// Practice grades a card, so this test owns the "Phone screens" profile that only e2e-seed.ts creates.
test("practice, summary, Progress, Settings, Profile and Import fit the phone", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const zip = readFileSync(join(process.cwd(), "fixtures/science-w2-deck.zip"));
  await page.goto("/");
  await page.getByRole("button", { name: "Phone screens", exact: true }).click();
  await page.waitForURL("**/library");

  await page.goto("/import");
  await page.waitForLoadState("networkidle"); // choosing before hydration would drop the change event
  await shellSettled(page);
  await checkPhone(page);
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "science-w2-deck.zip", mimeType: "application/zip", buffer: zip });
  await expect(page.getByRole("region", { name: "Preview" })).toContainText("16 cards ready");
  await checkPhone(page);
  await page.getByLabel("Deck name").fill("Phone Science");
  await page.getByRole("button", { name: /^Add \d+ cards?$/ }).click();
  await expect(page.getByRole("status")).toContainText("16 cards added");
  await checkPhone(page);

  await page.goto("/library");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText("Card 1 of 5")).toBeVisible();
  await checkPhone(page); // question side
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByRole("button", { name: /^Got it/ })).toBeVisible();
  await checkPhone(page); // answer side with the grade bar
  await page.getByRole("button", { name: /^Got it/ }).click();
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();
  await checkPhone(page);

  await page.goto("/progress");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Cards reviewed" }).first(),
  ).toBeVisible();
  await shellSettled(page);
  await checkPhone(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  await shellSettled(page);
  await checkPhone(page);
  await page.goto("/profile");
  await expect(page.getByLabel("Name")).toBeVisible();
  await shellSettled(page);
  await checkPhone(page);
});

// Below 640 px the expanded sidebar overlays the page (F23.7), so the page never scrolls sideways.
test("expanded sidebar at 375 px overlays the page without horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await shellSettled(page);
  const toggle = page.getByRole("banner").getByRole("button", { name: "Sidebar" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(() => page.getByRole("complementary").evaluate((el) => el.getBoundingClientRect().width))
    .toBe(256);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBe(clientWidth);
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
  }
  // The toggle stays reachable above the overlay, and choosing a link closes it on the new page.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.getByRole("link", { name: "Progress" }).click();
  await page.waitForURL("**/progress");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

import { expect, test } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

const COOKIE = "flipside_profile";

test("no cookie shows the picker without deck counts, in both themes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nicole" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText(/deck|due/i);
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

test("picking sets the cookie and opens the library; a valid cookie skips the picker", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nicole" }).click();
  await page.waitForURL("**/library");
  const cookie = (await context.cookies()).find((c) => c.name === COOKIE);
  expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);

  await page.goto("/");
  await page.waitForURL("**/library");
  await page.goto("/?switch=1");
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
});

test("an invalid cookie shows the picker", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: COOKIE, value: "nope", url: baseURL! }]);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
});

test("loading and error states render, and Retry recovers", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let fail = true;
  await page.route("**/api/v1/profiles", async (route) => {
    await gate;
    if (fail) return route.abort();
    return route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Loading");
  release();
  await expect(page.getByRole("alert").filter({ hasText: "home server" })).toBeVisible();
  await setTheme(page, "dark");
  await expectNoSeriousA11y(page);
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
});

// AC14: the app password gate (AG1 to AG3). These tests use unsigned contexts on purpose.
import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, expectNoSeriousA11y, setTheme, signInContext } from "./helpers";

test("without signing in pages redirect to /login and the API answers 401, except health and login", async ({ page }) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Enter the app password" })).toBeVisible();
  // The version stamp is inlined from package.json at build time, so a real build shows v<semver>+<build>.<sha>, not "dev".
  await expect(page.getByText(/^v\d+\.\d+\.\d+\+(\d+\.[0-9a-f]+|dev)$/)).toBeVisible();

  expect((await page.request.get("/api/v1/decks")).status()).toBe(401);
  expect((await page.request.get("/api/v1/health")).status()).toBe(200);
  expect((await page.request.post("/api/v1/auth/login", { data: { password: "nope" } })).status()).toBe(401);
});

test("a wrong password shows a neutral error; the right one opens the app", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That password did not work")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
  expect((await page.request.get("/api/v1/profiles")).status()).toBe(200);
});

test("Sign out ends the session", async ({ browser }) => {
  const context = await browser.newContext();
  await signInContext(context);
  const page = await context.newPage();
  await page.goto("/");
  // The e2e-only profile keeps this test off the seeded profiles other specs use.
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("complementary").getByRole("button", { expanded: false }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/v1/decks")).status()).toBe(401);
  await context.close();
});

test("/login passes axe in both themes", async ({ page }) => {
  await page.goto("/login");
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
  }
});

// AC27: account sign-in (AU1, AU2, AU7). These tests use unsigned contexts on purpose.
import { expect, test } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD, expectNoSeriousA11y, setTheme, signInContext } from "./helpers";

const NEUTRAL = "That email and password did not work";

test("without signing in pages redirect to /login and the API answers 401, except health and login", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  // The version stamp is inlined from package.json at build time, so a real build shows v<semver>+<build>.<sha>, not "dev".
  await expect(page.getByText(/^v\d+\.\d+\.\d+\+(\d+\.[0-9a-f]+|dev)$/)).toBeVisible();

  expect((await page.request.get("/api/v1/decks")).status()).toBe(401);
  expect((await page.request.get("/api/v1/health")).status()).toBe(200);
  expect(
    (
      await page.request.post("/api/v1/auth/login", { data: { email: "x@y.co", password: "nope" } })
    ).status(),
  ).toBe(401);
});

test("a wrong password, an unknown email and a malformed body show the same message; the right pair opens the app", async ({
  page,
}) => {
  const attempts = [
    [E2E_EMAIL, "not-the-password"],
    ["nobody@flipside.local", E2E_PASSWORD],
  ] as const;
  for (const [email, password] of attempts) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(NEUTRAL)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  }
  // A body the form cannot send: same status and message from the API.
  const bad = await page.request.post("/api/v1/auth/login", { data: "not json" });
  expect(bad.status()).toBe(401);
  expect((await bad.json()).error.message).toContain(NEUTRAL);

  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
  expect((await page.request.get("/api/v1/profiles")).status()).toBe(200);
});

test("Log out revokes the token: the old cookie is refused", async ({ browser }) => {
  const context = await browser.newContext();
  await signInContext(context);
  const oldCookie = (await context.cookies()).find((c) => c.name === "flipside_sign_in")!;
  expect(oldCookie.httpOnly).toBe(true);
  expect(oldCookie.sameSite).toBe("Lax");
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("complementary").getByRole("button", { expanded: false }).click();
  const profileCookie = (await context.cookies()).find((c) => c.name === "flipside_profile")!;
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/v1/decks")).status()).toBe(401);

  // Replay the old cookie, with the profile cookie, from a fresh context: the proxy lets it
  // through, the server must not, on data routes as well as log out (AU6, AU7).
  const replay = await browser.newContext({
    storageState: { cookies: [oldCookie, profileCookie], origins: [] },
  });
  expect((await replay.request.post("/api/v1/auth/logout")).status()).toBe(401);
  expect((await replay.request.get("/api/v1/library")).status()).toBe(401);
  expect((await replay.request.get("/api/v1/me")).status()).toBe(401);
  expect((await replay.request.get("/api/v1/profiles")).status()).toBe(401);
  const replayPage = await replay.newPage();
  await replayPage.goto("/library");
  await expect(replayPage).toHaveURL(/\/login$/);
  await replay.close();
  await context.close();
});

test("/login passes axe in both themes", async ({ page }) => {
  await page.goto("/login");
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
  }
});

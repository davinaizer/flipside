import { expect, type Browser } from "@playwright/test";
import { signInContext, test } from "./helpers";

async function signIn(browser: Browser, name: string) {
  const context = await browser.newContext();
  await signInContext(context);
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name }).click();
  await page.waitForURL("**/library");
  return { context, page };
}

// One test: it changes a shared seeded profile's theme and restores it at the end.
test("theme toggle switches at once, saves to the profile, follows the profile", async ({ browser }, info) => {
  // The seeded profiles are shared, so only one project may change a theme at a time.
  test.skip(info.project.name !== "desktop", "runs once, on desktop");
  const a = await signIn(browser, "Nicole");
  const html = a.page.locator("html");
  const toggle = a.page.getByRole("switch", { name: /Dark theme/ });
  try {
    await expect(html).toHaveAttribute("data-theme", "light");
    const saved = a.page.waitForResponse((r) => r.url().endsWith("/api/v1/settings") && r.request().method() === "PUT");
    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "dark"); // no reload
    expect((await saved).status()).toBe(200);

    // Reload: the server renders dark from the first byte (no light flash).
    const raw = await (await a.page.request.get("/library")).text();
    expect(raw).toMatch(/<html[^>]*data-theme="dark"/);
    await a.page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Another browser context for the same profile picks it up.
    const b = await signIn(browser, "Nicole");
    await expect(b.page.locator("html")).toHaveAttribute("data-theme", "dark");
    await b.context.close();

    // Switching profile applies that profile's theme.
    await a.page.getByRole("complementary").getByRole("button", { expanded: false }).click();
    await a.page.getByRole("menuitem", { name: "Switch profile" }).click();
    await a.page.getByRole("button", { name: "Davi" }).click();
    await a.page.waitForURL("**/library");
    await expect(html).toHaveAttribute("data-theme", "light");
  } finally {
    await a.page.request.put("/api/v1/settings", { data: {} });
    await a.context.close();
  }
});

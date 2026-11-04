import { expect } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme, test } from "./helpers";

async function openMenu(page: import("@playwright/test").Page) {
  const trigger = page.getByRole("complementary").getByRole("button", { expanded: false });
  await trigger.click();
}

async function signIn(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name }).click();
  await page.waitForURL("**/library");
}

test("sidebar shows sections, profile and highlights the current one", async ({ page }) => {
  await signIn(page, "Nicole");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("complementary")).toContainText("Nicole");
  await nav.getByRole("link", { name: "Progress" }).click();
  await page.waitForURL("**/progress");
  await expect(nav.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Library" })).not.toHaveAttribute("aria-current");
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await openMenu(page);
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.waitForURL("**/settings");
  await openMenu(page);
  await expect(page.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Settings" })).toHaveCount(0);
  await expect(page).toHaveTitle("Flipside"); // soft navigation can leave the title empty for a moment
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

test("Switch profile returns to the picker from any page", async ({ page }) => {
  await signIn(page, "Davi");
  await page.goto("/settings");
  await openMenu(page);
  await page.getByRole("menuitem", { name: "Switch profile" }).click();
  await expect(page.getByRole("button", { name: "Nicole" })).toBeVisible();
});

test("no profile redirects to the picker", async ({ page }) => {
  await page.goto("/library");
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
});

test("an unknown or foreign deck URL shows not found inside the shell", async ({ page }) => {
  await signIn(page, "Davi");
  await page.goto("/decks/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: /find that deck/ })).toBeVisible();
  await openMenu(page);
  await expect(page.getByRole("menuitem", { name: "Switch profile" })).toBeVisible();
  await setTheme(page, "dark");
  await expectNoSeriousA11y(page);
});

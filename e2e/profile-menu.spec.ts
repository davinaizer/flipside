import { expect, type Page } from "@playwright/test";
import { expectNoSeriousA11y, setTheme, test } from "./helpers";

// Read-only on the seeded Nicole profile; Log out is covered in auth.spec.ts.
async function openMenu(page: Page) {
  await page.goto("/?switch=1");
  await page.getByRole("button", { name: "Nicole" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("complementary").getByRole("button", { expanded: false }).click();
}

test("the menu lists four items, each at least 44 px tall, and Escape closes it", async ({ page }) => {
  await openMenu(page);
  const items = page.getByRole("menuitem");
  await expect(items).toHaveText([/Profile/, /Settings/, /Switch profile/, /Log out/]);
  for (const item of await items.all()) {
    expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press("Escape");
  await expect(items).toHaveCount(0);
});

test("Profile and Settings open their pages, Switch profile returns to the picker", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("menuitem", { name: "Profile", exact: true }).click();
  await page.waitForURL("**/profile");
  await page.getByRole("complementary").getByRole("button", { expanded: false }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.waitForURL("**/settings");
  await page.getByRole("complementary").getByRole("button", { expanded: false }).click();
  await page.getByRole("menuitem", { name: "Switch profile" }).click();
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
});

test("the open menu passes axe in light and dark", async ({ page }) => {
  await openMenu(page);
  await expect(page.getByRole("menuitem")).toHaveCount(4);
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
  }
});

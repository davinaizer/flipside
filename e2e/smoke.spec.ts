import { expect } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, guardThirdParty, setTheme, test } from "./helpers";

test("home renders, is accessible in both themes, and stays local", async ({ page }) => {
  const external = await guardThirdParty(page);
  await page.goto("/");
  await expect(page.getByRole("main")).toContainText("Who is studying?");

  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }

  await page.waitForLoadState("networkidle");
  expect(external).toEqual([]);
});

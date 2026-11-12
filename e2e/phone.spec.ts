import { expect, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme, test } from "./helpers";

// W3: login, picker, Library and Deck at 375 x 812 through the existing responsive layout, in both themes. Read-only on
// the seeded Davi and Nicole profiles.

/** No horizontal page scroll, every control inside the viewport, axe and 44 px, in both themes. */
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

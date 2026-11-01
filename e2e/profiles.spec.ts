import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

const DECK = { Davi: "Davi Science", Nicole: "Nicole History" } as const;
type Name = keyof typeof DECK;

async function pick(page: Page, name: Name) {
  await page.goto("/?switch=1");
  await page.getByRole("button", { name }).click();
  await page.waitForURL("**/library");
}

async function deckId(page: Page, name: Name): Promise<string> {
  await pick(page, name);
  const href = await page.getByRole("link", { name: DECK[name] }).getAttribute("href");
  return href!.split("/").pop()!;
}

for (const [me, other] of [
  ["Davi", "Nicole"],
  ["Nicole", "Davi"],
] as const) {
  test(`${me} sees only their deck; ${other}'s deck is not found by URL and API`, async ({
    page,
  }) => {
    const otherId = await deckId(page, other);
    await pick(page, me);
    await expect(page.getByRole("link", { name: DECK[me] })).toBeVisible();
    await expect(page.getByText(DECK[other])).toHaveCount(0);

    await page.goto(`/decks/${otherId}`);
    await expect(page.getByRole("heading", { name: /find that deck/ })).toBeVisible();
    const res = await page.request.get(`/api/v1/decks/${otherId}`);
    expect(res.status()).toBe(404);

    await page.goto("/library");
    await page.getByRole("link", { name: "Switch profile" }).click();
    await expect(page.getByRole("button", { name: other })).toBeVisible();
  });
}

test("picker and Library pass axe and 44 px checks in both themes", async ({ page }) => {
  await page.goto("/?switch=1");
  await expect(page.getByRole("button", { name: "Davi" })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await expect(page.getByRole("link", { name: DECK.Davi })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

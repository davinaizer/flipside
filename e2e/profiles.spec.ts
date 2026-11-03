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

// AC15. The seeded profile is restored afterwards because other specs find it by name.
test("edit profile: avatar and name show in top bar, sidebar and picker, and survive reload", async ({
  page,
}) => {
  await pick(page, "Davi");
  const before = await (await page.request.get("/api/v1/me")).json();
  try {
    await page.getByRole("link", { name: "Davi, open profile" }).click();
    await page.waitForURL("**/profile");

    // Empty and 25-character names are rejected with a message and nothing is saved.
    const nameField = page.getByLabel("Name");
    await nameField.fill("");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("#profile-name-error")).toHaveText("Name cannot be empty");
    await nameField.fill("x".repeat(25));
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("#profile-name-error")).toHaveText(/24 characters or fewer/);
    expect((await (await page.request.get("/api/v1/me")).json()).profile.name).toBe("Davi");

    await nameField.fill("Davi Q");
    await page.getByLabel("panda").check({ force: true });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

    const check = async () => {
      await expect(page.getByRole("link", { name: "Davi Q, open profile" })).toBeVisible();
      await expect(page.getByText("Davi Q", { exact: true }).first()).toBeVisible();
      expect((await (await page.request.get("/api/v1/me")).json()).profile.avatar).toBe("panda");
    };
    await check();
    await page.reload();
    await check();
    await expect(page.getByLabel("panda")).toBeChecked();

    await page.goto("/?switch=1");
    await expect(page.getByRole("button", { name: "Davi Q" })).toBeVisible();
  } finally {
    await page.request.patch("/api/v1/me", { data: { name: before.profile.name, avatar: before.profile.avatar } });
  }
});

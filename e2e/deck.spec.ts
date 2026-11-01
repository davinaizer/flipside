import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

async function openSeededDeck(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("link", { name: "Davi Science" }).click();
  await page.waitForURL("**/decks/*");
  return page.url().split("/").pop()!;
}

/** Click and return the body of the PUT /sessions/{id} request it sends. */
async function practise(page: Page, name: string | RegExp) {
  await page.route("**/api/v1/sessions/*", (r) => r.fulfill({ status: 200, json: {} }));
  const put = page.waitForRequest((r) => r.method() === "PUT" && r.url().includes("/api/v1/sessions/"));
  await page.getByRole("button", { name }).click();
  const body = (await put).postDataJSON();
  await page.waitForURL("**/practice/*");
  await page.unroute("**/api/v1/sessions/*");
  return body;
}

test("topics show counts and mastered percentage in both themes", async ({ page }) => {
  await openSeededDeck(page);
  await expect(page.getByRole("heading", { name: "Davi Science" })).toBeVisible();
  await expect(page.getByText("1 card · 1 due · 0% mastered")).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

test("Practise scopes the deck, then ticked topics, and practise-anyway ignores due dates", async ({ page }) => {
  const id = await openSeededDeck(page);
  expect(await practise(page, "Practise deck (1 due)")).toEqual({ scope: { kind: "deck", deckId: id }, length: 5 });

  await page.goto(`/decks/${id}`);
  await page.getByRole("checkbox", { name: "Cells" }).check();
  expect(await practise(page, "Practise 1 topic (1 due)")).toEqual({
    scope: { kind: "topics", deckId: id, topics: ["Cells"] },
    length: 5,
  });

  await page.goto(`/decks/${id}`);
  await page.getByRole("checkbox", { name: "Energy" }).check();
  expect(await practise(page, /nothing due anyway \(ignores due dates\)/)).toEqual({
    scope: { kind: "topics", deckId: id, topics: ["Energy"], ignoreDue: true },
    length: 5,
  });
});

test("a deck that does not exist shows the not-found page", async ({ page }) => {
  await openSeededDeck(page);
  await page.goto("/decks/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "We can't find that deck" })).toBeVisible();
});

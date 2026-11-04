import { expect, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme, test } from "./helpers";

async function openSeededDeck(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("link", { name: /Davi (Science|Biology)/ }).click();
  await page.waitForURL("**/decks/*");
  return page.url().split("/").pop()!;
}

/** Click and return the body of the PUT /sessions/{id} request it sends. */
async function practise(page: Page, name: string | RegExp) {
  await page.route("**/api/v1/sessions/*", (r) => r.fulfill({ status: 200, json: {} }));
  const put = page.waitForRequest(
    (r) => r.method() === "PUT" && r.url().includes("/api/v1/sessions/"),
  );
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

test("Practise scopes the deck, then ticked topics, and practise-anyway ignores due dates", async ({
  page,
}) => {
  const id = await openSeededDeck(page);
  expect(await practise(page, "Practise deck (1 due)")).toEqual({
    scope: { kind: "deck", deckId: id },
    length: 5,
  });

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

test("Select all ticks every topic and Deselect all clears them", async ({ page }) => {
  await openSeededDeck(page);
  const boxes = page.getByRole("checkbox");
  await expect(boxes.first()).toBeVisible();
  const n = await boxes.count();
  expect(n).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  for (let i = 0; i < n; i++) await expect(boxes.nth(i)).toBeChecked();
  await expect(page.getByRole("button", { name: /Practise \d+ topics/ })).toBeVisible();
  await page.getByRole("button", { name: "Deselect all" }).click();
  for (let i = 0; i < n; i++) await expect(boxes.nth(i)).not.toBeChecked();
  await checkBothThemes(page);
});

test("not-found page passes axe in both themes", async ({ page }) => {
  await openSeededDeck(page);
  await page.goto("/decks/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "We can't find that deck" })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

async function checkBothThemes(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

test("the deck route shows the loading skeleton while the page loads", async ({ page }) => {
  // Hold the server render of the client-side navigation (not the prefetch) so loading.tsx stays on screen.
  let release!: () => void;
  const gate = new Promise<void>((res) => (release = res));
  await page.route(/\/decks\/[^/?]+(\?|$)/, async (r) => {
    const h = r.request().headers();
    if (h["rsc"] && !h["next-router-prefetch"]) await gate;
    await r.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("link", { name: /Davi (Science|Biology)/ }).click();
  await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();
  await checkBothThemes(page);
  release();
  await expect(page.getByRole("heading", { name: /Davi (Science|Biology)/ })).toBeVisible();
});

test("a deck that fails to load shows the error with Retry", async ({ page }) => {
  // The page cannot be made to fail on the server without breaking the shared seed, so the client-side
  // navigation gets the real stream with the page row swapped for an error row, as a thrown render looks.
  await page.route(/\/decks\/[^/?]+(\?|$)/, async (r) => {
    const h = r.request().headers();
    if (!h["rsc"] || h["next-router-prefetch"]) return r.continue();
    const res = await r.fetch();
    const body = await res.text();
    const pageRow = /"s":"__PAGE__".*?"children":\["\$L(\w+)"/.exec(body)?.[1];
    expect(pageRow, "page row in the stream").toBeTruthy();
    const failed = body.replace(
      new RegExp(`^${pageRow}:.*$`, "m"),
      `${pageRow}:E{"digest":"e2e-deck-failure"}`,
    );
    await r.fulfill({ response: res, body: failed });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("link", { name: /Davi (Science|Biology)/ }).click();
  await expect(page.getByRole("heading", { name: /home server/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await checkBothThemes(page);
});

test("the deck page has no Edit deck, Re-import or Delete deck (L9, D8)", async ({ page }) => {
  await openSeededDeck(page);
  for (const name of ["Edit deck", "Re-import", "Delete deck"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
});

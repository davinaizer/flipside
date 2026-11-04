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

test("edit saves name, group, colour and answer style, and the page updates", async ({ page }) => {
  await openSeededDeck(page);
  const edit = async (name: string, group: string, colour: string, style: string) => {
    await page.getByRole("button", { name: "Edit deck" }).click();
    const form = page.getByRole("form", { name: "Edit deck" });
    await form.getByLabel("Deck name").fill(name);
    await form.getByLabel("Group (optional)").fill(group);
    await form.getByText(colour, { exact: true }).click({ force: true });
    await form.getByText(style, { exact: true }).click({ force: true });
    const patch = page.waitForRequest((r) => r.method() === "PATCH");
    await form.getByRole("button", { name: "Save changes" }).click();
    return (await patch).postDataJSON();
  };
  expect(await edit("Davi Biology", "Sciences", "Sage", "Bullet list")).toEqual({
    name: "Davi Biology",
    groupName: "Sciences",
    color: "sage",
    answerStyle: "bullets",
  });
  await expect(page.getByRole("heading", { name: "Davi Biology" })).toBeVisible();
  // Restore, so the other tests still find the seeded name.
  await edit("Davi Science", "", "Mist", "Paragraph");
  await expect(page.getByRole("heading", { name: "Davi Science" })).toBeVisible();
});

test("Re-import opens the import screen for this deck", async ({ page }) => {
  const id = await openSeededDeck(page);
  await page.getByRole("link", { name: "Re-import" }).click();
  await page.waitForURL(`**/import?deckId=${id}`);
});

test("edit panel passes axe and 44 px in both themes", async ({ page }) => {
  await openSeededDeck(page);
  await page.getByRole("button", { name: "Edit deck" }).click();
  await expect(page.getByRole("form", { name: "Edit deck" })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

test("delete confirms, sends DELETE, returns to the Library; Keep deck cancels", async ({
  page,
}) => {
  const id = await openSeededDeck(page);
  // Mocked so the shared seeded deck survives the other tests.
  await page.route(`**/api/v1/decks/${id}`, (r) =>
    r.request().method() === "DELETE" ? r.fulfill({ status: 204 }) : r.continue(),
  );
  await page.getByRole("button", { name: "Edit deck" }).click();
  await page.getByRole("button", { name: "Delete deck" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete deck" });
  await expect(dialog).toContainText(/Delete ".+"\? This hides the deck and its 2 cards/);
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
  await dialog.getByRole("button", { name: "Keep deck" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Delete deck" }).click();
  const del = page.waitForRequest((r) => r.method() === "DELETE");
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete deck" }).click();
  await del;
  await page.waitForURL("**/library");
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

test("Delete deck is not on the deck page, only inside Edit deck (D8)", async ({ page }) => {
  await openSeededDeck(page);
  await expect(page.getByRole("button", { name: "Delete deck" })).toHaveCount(0);
  await page.getByRole("button", { name: "Edit deck" }).click();
  await expect(page.getByRole("form", { name: "Edit deck" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete deck" })).toBeVisible();
});

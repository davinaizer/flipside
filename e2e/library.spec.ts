import { expect, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme, test } from "./helpers";

const deck = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Science",
  groupName: null,
  color: "sage",
  answerStyle: "paragraph",
  topicCount: 4,
  topics: [],
  cardCount: 64,
  reviewCount: 20,
  dueCount: 12,
  mastery: { new: 4, notYet: 6, nearly: 9, gotIt: 45 },
};
const library = {
  today: { dueCount: 12, startableCount: 12, decksWithDue: 1, sessionLength: 10, weakCount: 3 },
  groups: [{ name: "Other", decks: [deck] }],
};

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Davi" }).click();
  await page.waitForURL("**/library");
}

test("Today panel, grouped decks and mastery legend show in both themes", async ({ page }) => {
  await page.route("**/api/v1/library", (r) => r.fulfill({ json: library }));
  await signIn(page);
  await expect(page.getByText("12 cards due in 1 deck. Sessions are 10 cards.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Other" })).toBeVisible();
  await expect(page.getByText("Got it 45")).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
});

test("Start practice and Weak cards each PUT a session and open /practice/{id}", async ({ page }) => {
  await page.route("**/api/v1/library", (r) => r.fulfill({ json: library }));
  await signIn(page);
  for (const [button, scope] of [
    ["Start practice", "all"],
    ["Weak cards (3)", "weak"],
  ] as const) {
    await page.goto("/library");
    const put = page.waitForRequest((r) => r.method() === "PUT" && r.url().includes("/api/v1/sessions/"));
    await page.route("**/api/v1/sessions/*", (r) => r.fulfill({ status: 200, json: {} }));
    await page.getByRole("button", { name: button }).click();
    const req = await put;
    const id = req.url().split("/").pop();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(req.postDataJSON()).toEqual({ scope: { kind: scope }, length: 10 });
    await page.waitForURL(`**/practice/${id}`);
    await page.unroute("**/api/v1/sessions/*");
  }
});

async function checkBothThemes(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

test("a failed load shows Retry, which loads again; axe and 44 px pass on the error", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/library", (r) => (calls++ === 0 ? r.abort() : r.fulfill({ json: library })));
  await signIn(page);
  await expect(page.getByRole("heading", { name: /home server/ })).toBeVisible();
  await checkBothThemes(page);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("loading shows a skeleton that passes axe", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((res) => (release = res));
  await page.route("**/api/v1/library", async (r) => {
    await gate;
    await r.fulfill({ json: library });
  });
  await signIn(page);
  await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();
  await checkBothThemes(page);
  release();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("empty Library offers one Add deck action and passes axe", async ({ page }) => {
  await page.route("**/api/v1/library", (r) =>
    r.fulfill({
      json: { today: { dueCount: 0, startableCount: 0, decksWithDue: 0, sessionLength: 10, weakCount: 0 }, groups: [] },
    }),
  );
  await signIn(page);
  await expect(page.getByRole("heading", { name: "No decks yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add deck" })).toHaveCount(1);
  await checkBothThemes(page);
});

test("search filters by deck name, shows a neutral no-match line, and passes axe", async ({ page }) => {
  const other = { ...deck, id: "22222222-2222-4222-8222-222222222222", name: "History", topics: ["Romans"] };
  await page.route("**/api/v1/library", (r) =>
    r.fulfill({ json: { ...library, groups: [{ name: "Other", decks: [deck, other] }] } }),
  );
  await signIn(page);
  const search = page.getByRole("searchbox").or(page.getByPlaceholder("Search decks and topics")).first();
  await search.fill("roman");
  await expect(page.getByRole("link", { name: /History/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Science/ })).toHaveCount(0);
  await search.fill("zzzz");
  await expect(page.getByText("Nothing matches that search.")).toBeVisible();
  await checkBothThemes(page);
});

// F17.4: the deck menu on the Library cards (real seeded data, so Edit deck can be saved).
const seeded = /Davi (Science|Biology)/;
const menuFor = (page: Page) => page.getByRole("button", { name: /^Deck actions for Davi (Science|Biology)$/ });

test("menu opens by mouse and offers Edit deck and Re-import; Re-import goes to the import screen", async ({ page }) => {
  await signIn(page);
  const id = (await page.getByRole("link", { name: seeded }).getAttribute("href"))!.split("/").pop();
  await menuFor(page).click();
  await expect(page.getByRole("menuitem", { name: "Edit deck" })).toBeVisible();
  await checkBothThemes(page);
  await page.getByRole("menuitem", { name: "Re-import" }).click();
  await page.waitForURL(`**/import?deckId=${id}`);
});

test("menu works by keyboard; Escape closes it and returns focus to the trigger", async ({ page }) => {
  await signIn(page);
  await menuFor(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Edit deck" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Re-import" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(menuFor(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter"); // Edit deck is first
  await expect(page.getByRole("form", { name: "Edit deck" })).toBeVisible();
});

test("Edit deck saves name, group, colour and answer style, and the card updates", async ({ page }) => {
  await signIn(page);
  const edit = async (name: string, group: string, colour: string, style: string) => {
    await menuFor(page).click();
    await page.getByRole("menuitem", { name: "Edit deck" }).click();
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
  await expect(page.getByRole("link", { name: "Davi Biology" })).toBeVisible();
  // Restore, so the other tests still find the seeded name.
  await edit("Davi Science", "", "Mist", "Paragraph");
  await expect(page.getByRole("link", { name: "Davi Science" })).toBeVisible();
});

test("edit panel passes axe and 44 px; Delete deck confirms, sends DELETE; Keep deck cancels", async ({ page }) => {
  await signIn(page);
  const id = (await page.getByRole("link", { name: seeded }).getAttribute("href"))!.split("/").pop();
  // Mocked so the shared seeded deck survives the other tests.
  await page.route(`**/api/v1/decks/${id}`, (r) =>
    r.request().method() === "DELETE" ? r.fulfill({ status: 204 }) : r.continue(),
  );
  await menuFor(page).click();
  await page.getByRole("menuitem", { name: "Edit deck" }).click();
  await expect(page.getByRole("form", { name: "Edit deck" })).toBeVisible();
  await checkBothThemes(page);
  await page.getByRole("button", { name: "Delete deck" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete deck" });
  await expect(dialog).toContainText(/Delete ".+"\? This hides the deck and its \d+ cards/);
  await checkBothThemes(page);
  await dialog.getByRole("button", { name: "Keep deck" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Delete deck" }).click();
  const del = page.waitForRequest((r) => r.method() === "DELETE");
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete deck" }).click();
  await del;
});

test("the Up to date tag sits at the top right with a long title on iPad portrait without overflow", async ({ page }) => {
  const long = { ...deck, name: "A very long deck name for revision of many topics in one go", dueCount: 0 };
  await page.route("**/api/v1/library", (r) =>
    r.fulfill({ json: { ...library, groups: [{ name: "Other", decks: [long] }] } }),
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await signIn(page);
  const tag = page.getByText("Up to date", { exact: true });
  await expect(tag).toBeVisible();
  const t = (await tag.boundingBox())!;
  const title = (await page.getByRole("link", { name: long.name }).boundingBox())!;
  expect(t.x + t.width).toBeLessThanOrEqual(768);
  const menu = (await page.getByRole("button", { name: `Deck actions for ${long.name}` }).boundingBox())!;
  expect(t.x).toBeGreaterThanOrEqual(title.x + title.width - 1);
  expect(t.x + t.width).toBeLessThanOrEqual(menu.x + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

const deck = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Science",
  groupName: null,
  color: "sage",
  answerStyle: "paragraph",
  topicCount: 4,
  topics: [],
  cardCount: 64,
  dueCount: 12,
  mastery: { new: 4, notYet: 6, nearly: 9, gotIt: 45 },
};
const library = {
  today: { dueCount: 12, decksWithDue: 1, sessionLength: 10, weakCount: 3 },
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

test("a failed load shows Retry, which loads again", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/library", (r) => (calls++ === 0 ? r.abort() : r.fulfill({ json: library })));
  await signIn(page);
  await expect(page.getByRole("heading", { name: /home server/ })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

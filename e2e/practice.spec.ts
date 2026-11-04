import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectNoSeriousA11y, expectTargetsAtLeast44, setTheme } from "./helpers";

const zip = readFileSync(join(process.cwd(), "fixtures/science-w2-deck.zip"));
const DECK = "Practice science";
type GradeName = "Not yet" | "Nearly" | "Got it";
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- API bodies read in assertions only

/** Each scenario owns a profile (see e2e-seed.ts), so graded state never leaks between tests or projects. */
async function signInWithDeck(page: Page, scenario: string, info: TestInfo) {
  await page.goto("/");
  await page.getByRole("button", { name: `Practice ${scenario} ${info.project.name}`, exact: true }).click();
  await page.waitForURL("**/library");
  const res = await page.request.post("/api/v1/imports", {
    multipart: {
      file: { name: "science-w2-deck.zip", mimeType: "application/zip", buffer: zip },
      name: DECK,
      color: "mist",
      answerStyle: "bullets",
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as Json).deckId as string;
}

async function checkBothThemes(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    await expectTargetsAtLeast44(page);
  }
}

const question = (page: Page) => page.getByTestId("practice-card").getByRole("heading", { level: 1 });
const reveal = (page: Page) => page.getByRole("button", { name: "Show answer" }).click();

/** Reveals the current card, taps a grade and returns the PUT /reviews response body. */
async function grade(page: Page, name: GradeName): Promise<Json> {
  await reveal(page);
  const done = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/api/v1/reviews/"));
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  return (await done).json();
}

async function putSession(page: Page, length: number | "all", scope: Json = { kind: "all" }): Promise<Json> {
  const res = await page.request.put(`/api/v1/sessions/${crypto.randomUUID()}`, { data: { scope, length } });
  expect(res.status()).toBe(200);
  return res.json();
}

/** The learning day (07:00 start, Europe/London) shifted by `plusDays`, as YYYY-MM-DD. */
function learningDay(iso: string, plusDays = 0): string {
  const shifted = new Date(Date.parse(iso) - 7 * 3600_000 + plusDays * 86_400_000);
  return shifted.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

test("Start practice, Weak cards and Deck Practise open real sessions; front, back and summary pass axe in both themes", async ({ page }, info) => {
  const deckId = await signInWithDeck(page, "open", info);
  await page.goto("/library");

  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText("Card 1 of 5")).toBeVisible();
  await expect(question(page)).toContainText("If a chemical reaction has occurred");
  await checkBothThemes(page); // front
  await reveal(page);
  await expect(page.getByRole("button", { name: /^Got it/ })).toBeVisible();
  await checkBothThemes(page); // back
  await page.getByRole("button", { name: /^Not yet/ }).click();
  await expect(page.getByText("Card 2 of 6")).toBeVisible(); // Not yet added a re-queued entry

  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();
  await expect(page.getByText("1 Not yet")).toBeVisible();
  await checkBothThemes(page); // summary

  const summaryUrl = page.url();
  await page.getByRole("button", { name: "Practise those now" }).click();
  await page.waitForURL((u) => /\/practice\/[^/]+$/.test(u.pathname) && u.href !== summaryUrl);
  await expect(page.getByText("Card 1 of 1")).toBeVisible();
  await expect(question(page)).toContainText("If a chemical reaction has occurred");
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();

  await page.getByRole("link", { name: "Back to Library" }).click();
  await page.waitForURL("**/library");
  await page.getByRole("button", { name: /^Weak cards/ }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText("Card 1 of 1")).toBeVisible();
  await expect(question(page)).toContainText("If a chemical reaction has occurred");

  await page.goto(`/decks/${deckId}`);
  await page.getByRole("button", { name: /^Practise deck/ }).click();
  await page.waitForURL("**/practice/*");
  await expect(page.getByText(/^Card 1 of \d+$/)).toBeVisible();
});

test("a 5-card session shows sublabels, schedules per section 5 and shows images on the right side", async ({ page }, info) => {
  const deckId = await signInWithDeck(page, "grade", info);
  await page.goto("/library");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/practice/*");

  // Card 1 (no image): a New card's sublabels.
  await reveal(page);
  await expect(page.getByRole("button", { name: /^Not yet\s*Again today$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Nearly\s*Again today$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Got it\s*Tomorrow$/ })).toBeVisible();
  let done = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/api/v1/reviews/"));
  await page.getByRole("button", { name: /^Got it/ }).click();
  let body = await (await done).json();
  expect(body.state).toMatchObject({ box: 2, lapses: 0, dueDate: learningDay(body.review.reviewedAt, 1) });

  // Card 2 has its picture on the back only.
  await expect(question(page)).toContainText("test for oxygen");
  // Both faces are in the DOM since the flip (F11.2), so look at the face that is showing.
  await expect(page.locator('[data-face="front"] img')).toHaveCount(0);
  await reveal(page);
  const img = page.locator('[data-face="back"] img');
  await expect(img).toHaveCount(1);
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  done = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/api/v1/reviews/"));
  await page.getByRole("button", { name: /^Nearly/ }).click();
  body = await (await done).json();
  expect(body.state).toMatchObject({ box: 1, lapses: 0, dueDate: learningDay(body.review.reviewedAt) });

  body = await grade(page, "Not yet"); // card 3
  expect(body.state).toMatchObject({ box: 1, lapses: 0, dueDate: learningDay(body.review.reviewedAt) });
  expect(body.requeue).toBe(true);
  await grade(page, "Got it"); // card 4
  await grade(page, "Got it"); // card 5
  await expect(question(page)).toContainText("carbon dioxide"); // card 3 came back at the end
  await grade(page, "Got it");
  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();

  // A second session: the two box 1 cards due today (cards 2 and 3, shuffled) lead. Got it then undo restores box, due date and review count.
  const reviewCount = async () => ((await (await page.request.get(`/api/v1/decks/${deckId}`)).json()) as Json).deck.reviewCount;
  await page.goto("/library");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL("**/practice/*");
  const lead = (await question(page).innerText()).trim();
  expect(lead).toMatch(/oxygen gas|carbon dioxide/);
  const before = await reviewCount();
  body = await grade(page, "Got it");
  expect(body.state).toMatchObject({ box: 2 });
  expect(await reviewCount()).toBe(before + 1);
  const undone = page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/v1/reviews/"));
  await page.getByRole("button", { name: "Undo last" }).click();
  const restored = await (await undone).json();
  expect(restored.state).toMatchObject({ box: 1, lapses: 0 });
  expect(restored.state.dueDate).toBe(learningDay(restored.review.undoneAt));
  expect(await reviewCount()).toBe(before);
  await expect(question(page)).toHaveText(lead);
});

test("Not yet reappears after four other cards, at most twice; undo steps back through the session", async ({ page }, info) => {
  await signInWithDeck(page, "requeue", info);
  const { session } = await putSession(page, 10);
  await page.goto(`/practice/${session.id}`);
  await expect(page.getByText("Card 1 of 10")).toBeVisible();

  const first = (await question(page).innerText()).trim();
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    const q = (await question(page).innerText()).trim();
    seen.push(q);
    if (i === 3) {
      // Undo steps back one card at a time, then forward again.
      await grade(page, "Got it");
      const undone = page.waitForResponse((r) => r.request().method() === "DELETE");
      await page.getByRole("button", { name: "Undo last" }).click();
      expect((await (await undone).json()).state).toBeNull(); // New again
      await expect(question(page)).toHaveText(q);
    }
    await grade(page, q === first ? "Not yet" : "Got it");
    if (i < 11) await expect(question(page)).not.toHaveText(q);
  }
  const at = seen.flatMap((q, i) => (q === first ? [i] : []));
  expect(at).toEqual([0, 5, 10]); // first attempt plus two re-queues, four other cards between
  await expect(page.getByRole("heading", { name: "Session summary" })).toBeVisible();
});

test("16 new cards with a cap of 10 give no more than 10 new cards in a local day; images sit on the right side", async ({ page }, info) => {
  await signInWithDeck(page, "cap", info);
  const first = await putSession(page, "all");
  expect(first.queue).toHaveLength(10);

  const byFront = (text: string) => first.queue.find((c: Json) => c.front.includes(text));
  expect(byFront("test for oxygen")).toMatchObject({ frontImage: null, backImage: { url: expect.any(String) } });
  expect(byFront("What direction will the particles move")).toMatchObject({
    frontImage: { url: expect.any(String) },
    backImage: null,
  });

  for (const c of first.queue as Json[]) {
    const res = await page.request.put(`/api/v1/reviews/${crypto.randomUUID()}`, {
      data: { sessionId: first.session.id, cardId: c.cardId, grade: "got_it", durationMs: 1000 },
    });
    expect(res.status()).toBe(200);
  }
  const second = await putSession(page, "all");
  expect(second.queue).toHaveLength(0); // 6 cards are still New, but today's cap is used up
});

// AC17: three ways to reveal, and hover, pressed and focus-visible on the buttons, in both themes.
test("reveal by button, card tap and Space; buttons show hover, pressed and focus states in both themes", async ({ page }, info) => {
  await signInWithDeck(page, "flip", info);
  const { session } = await putSession(page, 10);
  await page.goto(`/practice/${session.id}`);
  await expect(page.getByText("Card 1 of 10")).toBeVisible();
  const card = page.getByTestId("practice-card");
  const gotIt = page.getByRole("button", { name: /^Got it/ });
  const showAnswer = page.getByRole("button", { name: "Show answer" });
  await expect(page.getByText("How well did you know this?")).toHaveCount(0); // only after the reveal

  // Button.
  await expect(card).toHaveAttribute("data-revealed", "false");
  await showAnswer.click();
  await expect(card).toHaveAttribute("data-revealed", "true");
  await expect(page.getByText("How well did you know this?")).toBeVisible();
  await gotIt.click();

  // Card tap.
  await expect(card).toHaveAttribute("data-revealed", "false");
  await question(page).click();
  await expect(card).toHaveAttribute("data-revealed", "true");
  await gotIt.click();

  // Space.
  await expect(card).toHaveAttribute("data-revealed", "false");
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("data-revealed", "true");
  await gotIt.click();
  await expect(card).toHaveAttribute("data-revealed", "false");

  const read = (loc: ReturnType<Page["locator"]>) =>
    loc.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, filter: s.filter, scale: s.scale, outline: s.outlineStyle + " " + s.outlineWidth };
    });

  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    // Rest state, after moving the pointer away and blurring.
    await page.mouse.move(0, 0);
    await showAnswer.evaluate((el) => (el as HTMLElement).blur());
    const rest = await read(showAnswer);
    expect(rest.outline).toMatch(/^none/);

    await showAnswer.hover();
    // Touch devices (iPad) report hover: none, so Tailwind hover styles do not apply there; pressed and focus still do.
    if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
      await expect.poll(async () => (await read(showAnswer)).bg).not.toBe(rest.bg); // hover recolours
    }

    await page.mouse.down();
    await expect.poll(async () => (await read(showAnswer)).scale).not.toBe(rest.scale); // pressed shrinks
    await page.mouse.move(0, 0);
    await page.mouse.up();

    await showAnswer.focus(); // then Shift+Tab and Tab make the focus come from the keyboard, so :focus-visible matches
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(showAnswer).toBeFocused();
    expect((await read(showAnswer)).outline).not.toMatch(/^none/);
  }
});

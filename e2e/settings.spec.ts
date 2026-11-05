import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Browser, type Page } from "@playwright/test";
import {
  expectNoSeriousA11y,
  expectTargetsAtLeast44,
  setTheme,
  signInContext,
  test,
} from "./helpers";

// Projects run in parallel, so each owns a profile that only e2e-seed.ts creates for this file.
const ME = { desktop: "Settings Desktop", ipad: "Settings iPad" } as const;
const basePort = Number(process.env.E2E_PORT ?? "3100");

async function signIn(browser: Browser, name: string, use: object) {
  const context = await browser.newContext(use);
  await signInContext(context);
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name }).click();
  await page.waitForURL("**/library");
  await page.goto("/settings");
  return { context, page };
}

const card = (page: Page) => page.getByTestId("reading-card");

async function startServer(port: number): Promise<ChildProcess> {
  const DATABASE_URL = readFileSync(join(tmpdir(), `flipside-e2e-${basePort}.dburl`), "utf8");
  const child = spawn("pnpm", ["exec", "next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    env: { ...process.env, DATABASE_URL },
    stdio: "ignore",
  });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/v1/health`)).ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error("second app server did not start");
}

test("reading settings change the preview at once; settings and theme persist per profile, across contexts and a server restart", async ({
  browser,
}, info) => {
  const name = ME[info.project.name as keyof typeof ME];
  const use = info.project.use;
  const a = await signIn(browser, name, use);
  const { page } = a;
  let server: ChildProcess | undefined;
  try {
    // Live preview: the card style changes with no save wait and no reload.
    await expect(card(page)).toHaveCSS("font-size", "18px");
    await page.getByRole("button", { name: "Extra large" }).first().click();
    await expect(card(page)).toHaveCSS("font-size", "26px");
    await page.getByRole("button", { name: "Lexend" }).click();
    await expect(card(page)).toHaveCSS("font-family", /lexend/i);
    const before = await card(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.getByRole("button", { name: "Night" }).click();
    await expect
      .poll(() => card(page).evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(before);

    // Practice settings save and survive a reload.
    await page.getByRole("button", { name: "5", exact: true }).click();
    const newCards = page.getByLabel("New cards per day");
    const saved = page.waitForResponse(
      (r) => r.url().endsWith("/api/v1/settings") && r.request().method() === "PUT",
    );
    await newCards.fill("7");
    expect((await saved).status()).toBe(200);
    await page.getByRole("switch", { name: /Read questions aloud/ }).click();
    await page.getByRole("switch", { name: /Dark theme/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect
      .poll(
        async () => (await (await page.request.get("/api/v1/settings")).json()).settings.readAloud,
      )
      .toBe(true);

    const check = async (p: Page) => {
      await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(card(p)).toHaveCSS("font-size", "26px");
      await expect(p.getByLabel("New cards per day")).toHaveValue("7");
      await expect(p.getByRole("button", { name: "5", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(p.getByRole("switch", { name: /Read questions aloud/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    };
    await page.reload();
    await check(page);

    // New browser context, same profile.
    const b = await signIn(browser, name, use);
    await check(b.page);
    await b.context.close();

    // App server restart: a second server process on the same database.
    const port = basePort + (info.project.name === "desktop" ? 1 : 2);
    server = await startServer(port);
    const c = await signIn(browser, name, { ...use, baseURL: `http://127.0.0.1:${port}` });
    await check(c.page);
    await c.context.close();

    // Theme toggles on every screen built so far.
    for (const path of ["/library", "/import", "/progress", "/settings"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      for (const to of ["light", "dark"]) {
        // Wait for the save so the next page load sees it.
        const put = page.waitForResponse(
          (r) => r.url().endsWith("/api/v1/settings") && r.request().method() === "PUT",
        );
        await page.getByRole("switch", { name: /Dark theme/ }).click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", to);
        await put;
      }
    }
  } finally {
    server?.kill();
    await a.page.request.put("/api/v1/settings", { data: {} });
    await a.context.close();
  }
});

test("Settings passes axe and 44 px targets in both themes", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: ME[info.project.name as keyof typeof ME] }).click();
  await page.waitForURL("**/library");
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectNoSeriousA11y(page);
    expect(await expectTargetsAtLeast44(page)).toBeGreaterThan(10);
  }
});

test("read aloud is a switch with no On or Off text; the preview shows the practice card elements", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: ME[info.project.name as keyof typeof ME] }).click();
  await page.waitForURL("**/library");
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: /Read questions aloud/ });
  await expect(toggle).toHaveAttribute("aria-checked", /^(true|false)$/); // state exposed; the value depends on the other test
  await expect(toggle).not.toContainText(/\b(On|Off)\b/);
  // Not clicked: the first test owns this profile's settings, so this one only reads.

  // T8: chip, Question label, question, read-aloud button inside the card, the flip hint (R15) below it.
  const preview = card(page);
  await expect(preview.getByText("Question", { exact: true })).toBeVisible();
  await expect(preview.locator('span[aria-hidden="true"]').first()).toBeVisible(); // decorative read-aloud button
  await expect(preview).not.toContainText("Say your answer out loud first");
  const hint = await page.getByText("Say your answer out loud first, then show it.").boundingBox();
  const box = await preview.boundingBox();
  expect(hint!.y).toBeGreaterThanOrEqual(box!.y + box!.height);
  await expect(preview.getByText("Caching", { exact: true })).toBeVisible(); // topic chip
  // Same component as practice's front face: the shared flip-face box, and the read-aloud button shares the chip's row.
  await expect(preview).toHaveClass(/flip-face/);
  const chip = await preview.getByText("Caching", { exact: true }).boundingBox();
  const speaker = await preview.locator('span[aria-hidden="true"]').first().boundingBox();
  expect(Math.abs(chip!.y + chip!.height / 2 - (speaker!.y + speaker!.height / 2))).toBeLessThan(
    chip!.height,
  );
  expect(speaker!.x).toBeGreaterThan(chip!.x + chip!.width);
});

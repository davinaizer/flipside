import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

/** Same default as playwright.config.ts, which exports it to the app servers. */
export const E2E_PASSWORD = process.env.ADMIN_PASSWORD ?? "e2e-password";

/** Signs a context in through the login endpoint; the auth cookie stays in its jar (AG2). */
export async function signInContext(context: BrowserContext): Promise<void> {
  const res = await context.request.post("/api/v1/auth/login", {
    data: { password: E2E_PASSWORD },
  });
  expect(res.status()).toBe(200);
}

/** Drop-in for Playwright's `test`: the default context is already signed in, so specs reach the picker and the app. */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await signInContext(context);
    await provide(context);
  },
});

export type Theme = "light" | "dark";

export async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
}

/** Fails on any serious or critical axe violation in the current theme. */
export async function expectNoSeriousA11y(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

const CONTROLS =
  'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [tabindex]:not([tabindex="-1"])';

/** Every visible control is at least 44 x 44 CSS px. Returns how many were checked. */
export async function expectTargetsAtLeast44(page: Page): Promise<number> {
  const small = await page.$$eval(CONTROLS, (els) =>
    els
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
      // A visually hidden file or radio input is operated through its 44 px label or swatch, which is the visible target.
      .filter(
        ({ el }) =>
          !(
            el instanceof HTMLInputElement &&
            (el.type === "file" || el.type === "radio") &&
            el.closest("label")
          ),
      )
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(
        ({ el, r }) => `${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}`,
      ),
  );
  expect(small).toEqual([]);
  return page.locator(CONTROLS).count();
}

/** Records every request; anything not on the local host is collected and aborted. */
export async function guardThirdParty(page: Page): Promise<string[]> {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const { protocol, hostname } = new URL(route.request().url());
    const local = ["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname);
    if (local || protocol === "data:" || protocol === "blob:") return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  return external;
}

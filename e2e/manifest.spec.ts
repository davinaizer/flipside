import { expect, test } from "@playwright/test";

// No sign-in: the browser fetches the manifest without the cookie.
test("/manifest.webmanifest returns the manifest", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBe("Flipside");
  expect(m.display).toBe("standalone");
});

test("the head holds the iOS web-app tags and the touch icon, and no service worker", async ({
  page,
}) => {
  await page.goto("/login");
  const meta = (name: string) => page.locator(`head meta[name="${name}"]`).first();
  await expect(meta("mobile-web-app-capable")).toHaveAttribute("content", "yes");
  await expect(meta("apple-mobile-web-app-title")).toHaveAttribute("content", "Flipside");
  await expect(meta("apple-mobile-web-app-status-bar-style")).toHaveAttribute("content", "default");
  await expect(meta("viewport")).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    /apple-icon/,
  );
  await expect(page.locator('head meta[name="theme-color"]')).toHaveCount(2);
  await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const registrations = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistrations()).length,
  );
  expect(registrations).toBe(0);
});

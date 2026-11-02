import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const zip = readFileSync(join(process.cwd(), "fixtures/science-w2-deck.zip"));

// PRD section 16 targets on a production build (e2e-server runs next build and next start), against localhost.
// Timings include Playwright's own round trip, so they are slightly pessimistic. Each run logs its figures
// ("PERF ...") for docs/progress.md. The 2,000-row import is tests/integration/import-performance.test.ts.
test("first card within 1 s of Start, next card under 200 ms after a grade", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: `Perf ${info.project.name}`, exact: true }).click();
  await page.waitForURL("**/library");
  const res = await page.request.post("/api/v1/imports", {
    multipart: { file: { name: "science-w2-deck.zip", mimeType: "application/zip", buffer: zip }, name: "Perf science", color: "mist", answerStyle: "bullets" },
  });
  expect(res.status()).toBe(201);

  await page.goto("/library");
  const start = page.getByRole("button", { name: "Start practice" });
  await start.waitFor();
  await page.waitForLoadState("networkidle"); // a click before hydration would do nothing

  const t0 = Date.now();
  await start.click();
  await expect(page.getByText("Card 1 of 5")).toBeVisible();
  await expect(page.getByTestId("practice-card").getByRole("heading", { level: 1 })).toBeVisible();
  const firstCardMs = Date.now() - t0;

  const nextMs: number[] = [];
  for (let n = 2; n <= 5; n++) {
    await page.getByRole("button", { name: "Show answer" }).click();
    const grade = page.getByRole("button", { name: /^Got it/ });
    await grade.waitFor();
    const t1 = Date.now();
    await grade.click();
    await expect(page.getByText(`Card ${n} of 5`)).toBeVisible();
    nextMs.push(Date.now() - t1);
  }

  console.log(`PERF ${info.project.name}: first card ${firstCardMs} ms, next card ${nextMs.join("/")} ms`);
  expect(firstCardMs).toBeLessThan(1000);
  expect(Math.max(...nextMs)).toBeLessThan(200);
});

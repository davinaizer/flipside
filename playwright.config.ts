import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3100";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://127.0.0.1:${port}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { E2E_PORT: port },
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/phone.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "ipad",
      testIgnore: "**/phone.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 820 }, hasTouch: true },
    },
    {
      // W3: phones run through the responsive layout only. Only the specs that check it run here.
      name: "phone",
      testMatch: ["**/phone.spec.ts", "**/a11y.spec.ts"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
  ],
});

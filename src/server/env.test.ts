import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "./env";

describe("getEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it("tells the user to copy .env.example when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.resetModules();
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow(/Copy \.env\.example to \.env/);
  });
});

describe("parseEnv", () => {
  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow();
  });
  it("applies defaults", () => {
    const env = parseEnv({ DATABASE_URL: "postgres://x" });
    expect(env.IMAGE_STORE_DRIVER).toBe("fs");
    expect(env.PORT).toBe(3000);
  });
});

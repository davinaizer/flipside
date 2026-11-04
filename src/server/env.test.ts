import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME } from "@/shared/constants";
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

describe("getEnv without ADMIN_PASSWORD", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it("fails to start", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://x");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.resetModules();
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow(/ADMIN_PASSWORD/);
  });
});

describe("auth constants", () => {
  it("names the cookie and lasts 30 days", () => {
    expect(AUTH_COOKIE_NAME).toBe("flipside_auth");
    expect(AUTH_COOKIE_MAX_AGE_SECONDS).toBe(2_592_000);
  });
});

describe("parseEnv", () => {
  it("rejects a missing ADMIN_PASSWORD", () => {
    expect(() => parseEnv({ DATABASE_URL: "postgres://x" })).toThrow(/ADMIN_PASSWORD/);
    expect(() => parseEnv({ DATABASE_URL: "postgres://x", ADMIN_PASSWORD: "" })).toThrow();
  });
  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow();
  });
  it("applies defaults", () => {
    const env = parseEnv({ DATABASE_URL: "postgres://x", ADMIN_PASSWORD: "pw" });
    expect(env.IMAGE_STORE_DRIVER).toBe("fs");
    expect(env.PORT).toBe(3000);
  });
});

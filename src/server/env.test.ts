import { afterEach, describe, expect, it, vi } from "vitest";
import { SIGN_IN_COOKIE_NAME, SIGN_IN_TOKEN_MAX_AGE_SECONDS } from "@/shared/constants";
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

describe("sign-in constants", () => {
  it("names the cookie and lasts 30 days", () => {
    expect(SIGN_IN_COOKIE_NAME).toBe("flipside_sign_in");
    expect(SIGN_IN_TOKEN_MAX_AGE_SECONDS).toBe(2_592_000);
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

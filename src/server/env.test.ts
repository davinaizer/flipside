import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

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

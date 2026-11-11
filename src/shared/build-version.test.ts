import { describe, expect, it } from "vitest";
import { buildVersion } from "./build-version";

const ok = (...args: string[]) => (args[0] === "rev-list" ? "42" : "abc1234");
const fail = () => {
  throw new Error("not a git repository");
};

describe("buildVersion", () => {
  it("keeps the git stamp when git works, even with a Vercel SHA", () => {
    expect(buildVersion("0.1.0", ok, { VERCEL_GIT_COMMIT_SHA: "ffffffffff" })).toBe(
      "v0.1.0+42.abc1234",
    );
  });
  it("falls back to the first 7 characters of the Vercel SHA", () => {
    expect(buildVersion("0.1.0", fail, { VERCEL_GIT_COMMIT_SHA: "0123456789abcdef" })).toBe(
      "v0.1.0+vercel.0123456",
    );
  });
  it("falls back to dev with neither", () => {
    expect(buildVersion("0.1.0", fail, {})).toBe("v0.1.0+dev");
    expect(buildVersion("0.1.0", fail, { VERCEL_GIT_COMMIT_SHA: "" })).toBe("v0.1.0+dev");
  });
});

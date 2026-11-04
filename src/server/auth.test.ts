import { describe, expect, it } from "vitest";
import { AUTH_COOKIE_MAX_AGE_SECONDS } from "@/shared/constants";
import { checkPassword, signAuthToken, verifyAuthToken } from "./auth";

const NOW = 1_700_000_000_000;

describe("checkPassword", () => {
  it("accepts only the exact password", () => {
    expect(checkPassword("secret", "secret")).toBe(true);
    expect(checkPassword("secre", "secret")).toBe(false);
    expect(checkPassword("", "secret")).toBe(false);
    expect(checkPassword("secret-longer", "secret")).toBe(false);
  });
});

describe("auth token", () => {
  it("verifies a fresh token", () => {
    expect(verifyAuthToken(signAuthToken("pw", NOW), "pw", NOW + 1000)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const [exp, sig] = signAuthToken("pw", NOW).split(".");
    const later = `${Number(exp) + 1000}.${sig}`;
    expect(verifyAuthToken(later, "pw", NOW)).toBe(false);
    expect(verifyAuthToken(`${exp}.${sig!.slice(0, -1)}0`, "pw", NOW)).toBe(false);
    expect(verifyAuthToken(`${exp}.${sig}.x`, "pw", NOW)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = signAuthToken("pw", NOW);
    const justAfter = NOW + AUTH_COOKIE_MAX_AGE_SECONDS * 1000;
    expect(verifyAuthToken(token, "pw", justAfter - 1)).toBe(true);
    expect(verifyAuthToken(token, "pw", justAfter)).toBe(false);
  });

  it("rejects a token signed with another key, so a new password signs everyone out", () => {
    expect(verifyAuthToken(signAuthToken("old", NOW), "new", NOW)).toBe(false);
  });

  it("rejects missing or malformed tokens", () => {
    for (const t of [undefined, "", "abc", ".", "1.", ".sig", "x.y"]) {
      expect(verifyAuthToken(t, "pw", NOW)).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { signAuthToken } from "@/server/auth";
import { checkAccess } from "./access";

const PW = "test-password";
const call = (path: string, init: RequestInit = {}) =>
  checkAccess(new Request(`http://localhost${path}`, init), PW);
const withCookie = (value: string) => ({ headers: { cookie: `a=b; flipside_auth=${value}` } });
const valid = withCookie(signAuthToken(PW));

describe("checkAccess", () => {
  it("redirects pages to /login without a valid cookie", () => {
    for (const init of [{}, withCookie("junk"), withCookie(signAuthToken("other"))]) {
      const res = call("/library", init)!;
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    }
  });

  it("returns 401 on /api/v1 routes without a valid cookie", async () => {
    for (const [path, method] of [
      ["/api/v1/decks", "GET"],
      ["/api/v1/me", "GET"],
      ["/api/v1/health", "POST"],
      ["/api/v1/auth/login", "GET"],
      ["/api/v1/auth/logout", "POST"],
    ] as const) {
      const res = call(path, { method })!;
      expect(res.status, path).toBe(401);
      expect((await res.json()).error.code).toBe("unauthorized");
    }
  });

  it("leaves GET /health, POST /auth/login and the login page open", () => {
    expect(call("/api/v1/health")).toBeNull();
    expect(call("/api/v1/auth/login", { method: "POST" })).toBeNull();
    expect(call("/login")).toBeNull();
  });

  it("passes pages and API routes with a valid cookie", () => {
    expect(call("/library", valid)).toBeNull();
    expect(call("/api/v1/decks", valid)).toBeNull();
  });

  it("rejects an expired cookie", () => {
    const token = signAuthToken(PW, 0);
    const res = call("/api/v1/decks", withCookie(token));
    expect(res?.status).toBe(401);
  });
});

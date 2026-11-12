import { describe, expect, it } from "vitest";
import { checkAccess } from "./access";

const call = (path: string, init: RequestInit = {}) =>
  checkAccess(new Request(`http://localhost${path}`, init));
const withCookie = (value: string) => ({ headers: { cookie: `a=b; flipside_sign_in=${value}` } });

describe("checkAccess", () => {
  it("redirects pages to /login without a sign-in cookie", () => {
    for (const init of [{}, withCookie(""), { headers: { cookie: "other=x" } }]) {
      const res = call("/library", init)!;
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    }
  });

  it("returns 401 on /api/v1 routes without a sign-in cookie", async () => {
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

  it("leaves the app icons open", () => {
    for (const path of ["/icon/192", "/icon/maskable", "/apple-icon"])
      expect(call(path), path).toBeNull();
  });

  it("passes pages and API routes that carry the cookie; the token is verified downstream", () => {
    expect(call("/library", withCookie("any"))).toBeNull();
    expect(call("/api/v1/decks", withCookie("any"))).toBeNull();
  });
});

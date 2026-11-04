import { beforeAll, describe, expect, it } from "vitest";
import { verifyAuthToken } from "@/server/auth";
import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME } from "@/shared/constants";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";

// getEnv validates the whole environment; these routes never open the database.
beforeAll(() => {
  process.env.DATABASE_URL ??= "postgres://unused/unused";
});

const req = (body: unknown) =>
  new Request("http://localhost/api/v1/auth/login", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /auth/login", () => {
  it("sets a signed httpOnly SameSite=Lax cookie for the right password", async () => {
    const res = await login(req({ password: "test-password" }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`);
    const token = cookie.split(";")[0]!.split("=")[1];
    expect(verifyAuthToken(token, "test-password")).toBe(true);
  });

  it("returns the same neutral 401 with no cookie for wrong, empty or malformed input", async () => {
    const bodies: unknown[] = [{ password: "nope" }, { password: "" }, {}, "not json"];
    for (const b of bodies) {
      const res = await login(req(b));
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
      const json = await res.json();
      expect(json.error.code).toBe("invalid_password");
      expect(json.error.details).toEqual([]);
    }
  });
});

describe("POST /auth/logout", () => {
  it("clears the cookie", async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
    expect(cookie).toContain("Max-Age=0");
  });
});

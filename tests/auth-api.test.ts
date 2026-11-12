import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

const EMAIL = "login@example.com";
const PASSWORD = "a long enough password";

// getDb caches the first DATABASE_URL per test file, so every test shares one database.
let cached: ReturnType<typeof open> | undefined;
const setup = () => (cached ??= open());

async function open() {
  vi.stubEnv("DATABASE_URL", await freshDatabase(inject("testDatabaseUrl"), "flipside_auth_api"));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const { createAccount } = await import("@/server/accounts");
  await createAccount(EMAIL, PASSWORD, db);
  return {
    db,
    login: (await import("@/app/api/v1/auth/login/route")).POST,
    logout: (await import("@/app/api/v1/auth/logout/route")).POST,
  };
}

const post = (url: string, body: unknown, cookie?: string) =>
  new Request(url, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: cookie ? { cookie } : {},
  });

test(
  "login sets an httpOnly SameSite=Lax cookie holding a token the database knows by hash only",
  { timeout: 30_000 },
  async () => {
    const { db, login } = await setup();
    const res = await login(
      post("http://localhost/api/v1/auth/login", { email: EMAIL, password: PASSWORD }),
    );
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^flipside_sign_in=[A-Za-z0-9_-]{43,};/);
    for (const flag of ["HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=2592000"]) {
      expect(cookie).toContain(flag);
    }
    expect(cookie).not.toContain("Secure"); // plain HTTP on localhost
    const token = cookie.split(";")[0]!.split("=")[1]!;
    const { signInTokens } = await import("@/server/db/schema");
    const rows = await db.select().from(signInTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(token);
  },
);

test("the cookie is Secure on https and on a non-local host", { timeout: 30_000 }, async () => {
  const { login } = await setup();
  for (const url of [
    "https://flipside.example/api/v1/auth/login",
    "http://192.168.1.5/api/v1/auth/login",
  ]) {
    const res = await login(post(url, { email: EMAIL, password: PASSWORD }));
    expect(res.headers.get("set-cookie"), url).toContain("; Secure");
  }
});

test("every failure is the same 401 with no cookie", { timeout: 30_000 }, async () => {
  const { login } = await setup();
  const bodies: unknown[] = [
    { email: EMAIL, password: "wrong wrong wrong" },
    { email: "nobody@example.com", password: PASSWORD },
    { email: "not an email", password: PASSWORD },
    { email: EMAIL, password: "" },
    { email: EMAIL },
    {},
    "not json",
  ];
  const seen = new Set<string>();
  for (const b of bodies) {
    const res = await login(post("http://localhost/api/v1/auth/login", b));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    seen.add(JSON.stringify(await res.json()));
  }
  expect(seen.size).toBe(1);
});

test(
  "logout deletes the token, clears the cookie, and a replay is 401",
  { timeout: 30_000 },
  async () => {
    const { db, login, logout } = await setup();
    const res = await login(
      post("http://localhost/api/v1/auth/login", { email: EMAIL, password: PASSWORD }),
    );
    const cookie = res.headers.get("set-cookie")!.split(";")[0]!;

    const out = await logout(post("http://localhost/api/v1/auth/logout", {}, cookie));
    expect(out.status).toBe(200);
    const cleared = out.headers.get("set-cookie")!;
    expect(cleared).toContain("flipside_sign_in=;");
    expect(cleared).toContain("Max-Age=0");
    const { signInTokens } = await import("@/server/db/schema");
    const hash = createHash("sha256").update(cookie.split("=")[1]!).digest("hex");
    expect(
      await db.select().from(signInTokens).where(eq(signInTokens.tokenHash, hash)),
    ).toHaveLength(0);

    const replay = await logout(post("http://localhost/api/v1/auth/logout", {}, cookie));
    expect(replay.status).toBe(401);
    const none = await logout(post("http://localhost/api/v1/auth/logout", {}));
    expect(none.status).toBe(401);
  },
);

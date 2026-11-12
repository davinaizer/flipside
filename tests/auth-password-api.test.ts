import { eq } from "drizzle-orm";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

// AC31: change password keeps the caller's sign-in token and revokes the others (AU8).
const OLD = "the old password 1";
const NEW = "the brand new password";

// getDb caches the first DATABASE_URL per test file, so the tests share one database and each makes its own account.
let cached: ReturnType<typeof open> | undefined;
let n = 0;
async function setup() {
  const base = await (cached ??= open());
  return base(`change${n++}@example.com`);
}

async function open() {
  vi.stubEnv("DATABASE_URL", await freshDatabase(inject("testDatabaseUrl"), "flipside_auth_pw"));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const { createAccount } = await import("@/server/accounts");
  const { signIn } = await import("@/server/sign-in");
  const { POST } = await import("@/app/api/v1/auth/password/route");
  return async (EMAIL: string) => {
    const { id } = await createAccount(EMAIL, OLD, db);
    const device = async () => `flipside_sign_in=${(await signIn(EMAIL, OLD, db))!.token}`;
    const change = (cookie: string | undefined, body: unknown) =>
      POST(
        new Request("http://localhost/api/v1/auth/password", {
          method: "POST",
          body: JSON.stringify(body),
          headers: cookie ? { cookie } : {},
        }),
      );
    const hashOf = async () => {
      const { accounts } = await import("@/server/db/schema");
      return (await db.select().from(accounts).where(eq(accounts.id, id)))[0]!.passwordHash;
    };
    const alive = async (cookie: string) => {
      const { signedInAccount } = await import("@/server/sign-in");
      const jar = {
        get: (n: string) =>
          cookie.startsWith(`${n}=`) ? { value: cookie.split("=")[1]! } : undefined,
      };
      return (await signedInAccount(jar, db)) !== null;
    };
    return { db, device, change, hashOf, alive, EMAIL };
  };
}

test(
  "a wrong current password is the neutral 401 and changes nothing",
  { timeout: 60_000 },
  async () => {
    const { device, change, hashOf, alive } = await setup();
    const cookie = await device();
    const before = await hashOf();
    const res = await change(cookie, { current: "wrong password!!", new: NEW, confirm: NEW });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("invalid_credentials");
    expect(await hashOf()).toBe(before);
    expect(await alive(cookie)).toBe(true);
  },
);

test(
  "a short new password, a mismatched confirm and a bad body are refused",
  { timeout: 60_000 },
  async () => {
    const { device, change, hashOf } = await setup();
    const cookie = await device();
    const before = await hashOf();
    expect((await change(cookie, { current: OLD, new: "short", confirm: "short" })).status).toBe(
      400,
    );
    expect((await change(cookie, { current: OLD, new: NEW, confirm: NEW + "x" })).status).toBe(400);
    expect((await change(cookie, { current: OLD })).status).toBe(400);
    expect(await hashOf()).toBe(before);
  },
);

test("without a sign-in cookie it is 401", { timeout: 60_000 }, async () => {
  const { change } = await setup();
  expect((await change(undefined, { current: OLD, new: NEW, confirm: NEW })).status).toBe(401);
});

test(
  "success stores a new hash, keeps the caller's token and revokes the others",
  { timeout: 60_000 },
  async () => {
    const { device, change, hashOf, alive, EMAIL } = await setup();
    const mine = await device();
    const other = await device();
    const before = await hashOf();
    const res = await change(mine, { current: OLD, new: NEW, confirm: NEW });
    expect(res.status).toBe(200);
    expect(await hashOf()).not.toBe(before);
    expect(await alive(mine)).toBe(true);
    expect(await alive(other)).toBe(false);
    expect((await change(other, { current: NEW, new: OLD, confirm: OLD })).status).toBe(401);
    const { signIn } = await import("@/server/sign-in");
    expect(await signIn(EMAIL, NEW)).not.toBeNull();
  },
);

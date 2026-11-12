import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

// getDb caches the first DATABASE_URL per test file, so every test shares one database.
let cached: ReturnType<typeof open> | undefined;
async function setup() {
  return (cached ??= open());
}

async function open() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_sign_in_tokens");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

const PASSWORD = "a long enough password";
const DAY_MS = 24 * 60 * 60 * 1000;
let n = 0;

async function account() {
  const db = await setup();
  const { createAccount } = await import("@/server/accounts");
  return { db, account: await createAccount(`t${++n}@example.com`, PASSWORD, db) };
}

test("issuing returns 32 random bytes for a cookie and stores only the SHA-256 hash, 30 days ahead", async () => {
  const { db, account: a } = await account();
  const { issueSignInToken } = await import("@/server/sign-in");
  const { signInTokens } = await import("@/server/db/schema");
  const now = new Date("2026-11-12T10:00:00Z");
  const { token, expiresAt } = await issueSignInToken(a.id, db, now);
  expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(Buffer.from(token, "base64url").length).toBeGreaterThanOrEqual(32);
  expect(expiresAt.getTime() - now.getTime()).toBe(30 * DAY_MS);

  const rows = await db.select().from(signInTokens).where(eq(signInTokens.accountId, a.id));
  expect(rows).toHaveLength(1);
  expect(rows[0].tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
  expect(rows[0].expiresAt.getTime()).toBe(expiresAt.getTime());
  // The raw token is in no column of the table.
  const all = await db.select().from(signInTokens);
  expect(JSON.stringify(all)).not.toContain(token);

  const second = await issueSignInToken(a.id, db, now);
  expect(second.token).not.toBe(token);
});

test("resolving returns the account, and null for unknown, expired or revoked tokens", async () => {
  const { db, account: a } = await account();
  const { issueSignInToken, resolveSignInToken, revokeSignInToken } =
    await import("@/server/sign-in");
  const { signInTokens } = await import("@/server/db/schema");
  const now = new Date("2026-11-12T10:00:00Z");
  const { token, expiresAt } = await issueSignInToken(a.id, db, now);

  expect(await resolveSignInToken(token, db, now)).toEqual({ id: a.id, email: a.email });
  expect(await resolveSignInToken("unknown", db, now)).toBeNull();
  expect(await resolveSignInToken("", db, now)).toBeNull();
  expect(await resolveSignInToken(token, db, expiresAt)).toBeNull();
  expect(await resolveSignInToken(token, db, new Date(expiresAt.getTime() + 1))).toBeNull();

  await revokeSignInToken(token, db);
  expect(await db.select().from(signInTokens).where(eq(signInTokens.accountId, a.id))).toHaveLength(
    0,
  );
  expect(await resolveSignInToken(token, db, now)).toBeNull();
});

test("revokeOtherSignInTokens keeps only the given token of that account", async () => {
  const { db, account: a } = await account();
  const { account: other } = await account();
  const { issueSignInToken, resolveSignInToken, revokeOtherSignInTokens } =
    await import("@/server/sign-in");
  const now = new Date("2026-11-12T10:00:00Z");
  const keep = await issueSignInToken(a.id, db, now);
  const drop = await issueSignInToken(a.id, db, now);
  const elsewhere = await issueSignInToken(other.id, db, now);

  await revokeOtherSignInTokens(keep.token, db);
  expect(await resolveSignInToken(keep.token, db, now)).toMatchObject({ id: a.id });
  expect(await resolveSignInToken(drop.token, db, now)).toBeNull();
  expect(await resolveSignInToken(elsewhere.token, db, now)).toMatchObject({ id: other.id });
});

test("issuing deletes the account's expired tokens and leaves live ones and other accounts alone", async () => {
  const { db, account: a } = await account();
  const { account: other } = await account();
  const { issueSignInToken } = await import("@/server/sign-in");
  const { signInTokens } = await import("@/server/db/schema");
  const start = new Date("2026-01-01T10:00:00Z");
  const old = await issueSignInToken(a.id, db, start);
  const otherOld = await issueSignInToken(other.id, db, start);
  const later = new Date(start.getTime() + 20 * DAY_MS);
  const live = await issueSignInToken(a.id, db, later);
  const hash = (t: string) => createHash("sha256").update(t).digest("hex");

  await issueSignInToken(a.id, db, new Date(start.getTime() + 31 * DAY_MS));
  const mine = (await db.select().from(signInTokens).where(eq(signInTokens.accountId, a.id))).map(
    (r) => r.tokenHash,
  );
  expect(mine).not.toContain(hash(old.token));
  expect(mine).toContain(hash(live.token));
  expect(mine).toHaveLength(2);
  const theirs = await db
    .select()
    .from(signInTokens)
    .where(eq(signInTokens.tokenHash, hash(otherOld.token)));
  expect(theirs).toHaveLength(1);
});

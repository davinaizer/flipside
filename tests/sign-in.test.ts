import { eq } from "drizzle-orm";
import { beforeEach, expect, inject, test, vi } from "vitest";
import { freshDatabase } from "./helpers/db";

// Wrap verifyPassword in a spy so the unknown-email test can see that scrypt still runs.
vi.mock("@/server/passwords", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/passwords")>();
  return { ...original, verifyPassword: vi.fn(original.verifyPassword) };
});

// getDb caches the first DATABASE_URL per test file, so every test shares one database.
let cached: ReturnType<typeof open> | undefined;
async function setup() {
  return (cached ??= open());
}

async function open() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_sign_in");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

const PASSWORD = "a long enough password";
const WRONG = "not the password at all";
const MINUTE_MS = 60 * 1000;
const T0 = new Date("2026-11-12T10:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * MINUTE_MS);
let n = 0;

beforeEach(() => vi.clearAllMocks());

async function account() {
  const db = await setup();
  const { createAccount } = await import("@/server/accounts");
  const email = `s${++n}@example.com`;
  await createAccount(email, PASSWORD, db);
  const { signIn, resolveSignInToken } = await import("@/server/sign-in");
  return { db, email, signIn, resolveSignInToken };
}

async function fail(times: number, email: string, minute = 0) {
  const { signIn } = await import("@/server/sign-in");
  const db = await setup();
  for (let i = 0; i < times; i++) expect(await signIn(email, WRONG, db, at(minute))).toBeNull();
}

test("the right pair returns a sign-in token for the account", async () => {
  const { db, email, signIn, resolveSignInToken } = await account();
  const result = await signIn(email, PASSWORD, db, T0);
  expect(result).not.toBeNull();
  const resolved = await resolveSignInToken(result!.token, db, T0);
  expect(resolved?.email).toBe(email);
});

test("unknown email, wrong password and malformed email all return the same failure", async () => {
  const { db, email, signIn } = await account();
  const unknown = await signIn("nobody@example.com", PASSWORD, db, T0);
  const wrong = await signIn(email, WRONG, db, T0);
  const malformed = await signIn("not an email", PASSWORD, db, T0);
  expect(unknown).toBeNull();
  expect(wrong).toBeNull();
  expect(malformed).toBeNull();
});

test("an unknown or malformed email still runs a scrypt verify", async () => {
  const { db, signIn } = await account();
  const { verifyPassword } = await import("@/server/passwords");
  await signIn("nobody-here@example.com", PASSWORD, db, T0);
  expect(verifyPassword).toHaveBeenCalledTimes(1);
  expect(vi.mocked(verifyPassword).mock.calls[0][1]).toMatch(/^scrypt\$/);
  expect(await vi.mocked(verifyPassword).mock.results[0].value).toBe(false);
  await signIn("not an email", PASSWORD, db, T0);
  expect(verifyPassword).toHaveBeenCalledTimes(2);
});

test("five failures in the window block the sixth even with the right password; another email is unaffected", async () => {
  const { db, email, signIn } = await account();
  const other = await account();
  await fail(5, email);
  expect(await signIn(email, PASSWORD, db, at(10))).toBeNull();
  expect(await signIn(other.email, PASSWORD, db, at(10))).not.toBeNull();
});

test("four failures do not block the right password", async () => {
  const { db, email, signIn } = await account();
  await fail(4, email);
  expect(await signIn(email, PASSWORD, db, at(1))).not.toBeNull();
});

test("after the window the right password works again", async () => {
  const { db, email, signIn } = await account();
  await fail(5, email);
  expect(await signIn(email, PASSWORD, db, at(14))).toBeNull();
  expect(await signIn(email, PASSWORD, db, at(15))).not.toBeNull();
});

test("attempts older than the window are deleted on the next attempt for that email", async () => {
  const { db, email, signIn } = await account();
  const other = await account();
  const { signInAttempts } = await import("@/server/db/schema");
  await fail(3, email);
  await fail(2, other.email);
  const rows = async (e: string) =>
    db.select().from(signInAttempts).where(eq(signInAttempts.email, e));
  expect(await rows(email)).toHaveLength(3);

  await signIn(email, WRONG, db, at(20));
  const left = await rows(email);
  expect(left).toHaveLength(1);
  expect(left[0].attemptedAt.getTime()).toBe(at(20).getTime());
  // Only the attempting email is cleaned.
  expect(await rows(other.email)).toHaveLength(2);
});

test("email matching ignores case and surrounding whitespace, for sign-in and the limit", async () => {
  const { db, email, signIn } = await account();
  expect(await signIn(`  ${email.toUpperCase()} `, PASSWORD, db, T0)).not.toBeNull();
  await fail(5, ` ${email.toUpperCase()}`);
  expect(await signIn(email, PASSWORD, db, at(1))).toBeNull();
});

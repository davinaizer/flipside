import { eq } from "drizzle-orm";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

// getDb caches the first DATABASE_URL per test file, so every test shares one database.
let cached: ReturnType<typeof open> | undefined;
async function setup() {
  return (cached ??= open());
}

async function open() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_accounts");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

const PASSWORD = "a long enough password";

test("createAccount trims and lower-cases the email and refuses duplicates in any case", async () => {
  const db = await setup();
  const { createAccount } = await import("@/server/accounts");
  const { accounts } = await import("@/server/db/schema");
  const a = await createAccount("  Ada@Example.COM ", PASSWORD, db);
  expect(a.email).toBe("ada@example.com");
  expect(a).not.toHaveProperty("passwordHash");
  const [row] = await db.select().from(accounts).where(eq(accounts.id, a.id));
  expect(row.passwordHash.startsWith("scrypt$")).toBe(true);
  expect(row.passwordHash).not.toContain(PASSWORD);
  await expect(createAccount("ADA@example.com", PASSWORD, db)).rejects.toMatchObject({
    status: 409,
  });
});

test("createAccount refuses a short password and a bad email", async () => {
  const db = await setup();
  const { createAccount } = await import("@/server/accounts");
  await expect(createAccount("b@example.com", "short", db)).rejects.toMatchObject({ status: 400 });
  await expect(createAccount("not-an-email", PASSWORD, db)).rejects.toMatchObject({ status: 400 });
});

test("setPassword stores a new hash and deletes that account's sign-in tokens only", async () => {
  const db = await setup();
  const { createAccount, setPassword } = await import("@/server/accounts");
  const { accounts, signInTokens } = await import("@/server/db/schema");
  const { verifyPassword } = await import("@/server/passwords");
  const a = await createAccount("a@example.com", PASSWORD, db);
  const o = await createAccount("o@example.com", PASSWORD, db);
  const expiresAt = new Date(Date.now() + 60_000);
  await db.insert(signInTokens).values([
    { accountId: a.id, tokenHash: "t1", expiresAt },
    { accountId: a.id, tokenHash: "t2", expiresAt },
    { accountId: o.id, tokenHash: "t3", expiresAt },
  ]);
  await setPassword(a.id, "another long password", db);
  const [row] = await db.select().from(accounts).where(eq(accounts.id, a.id));
  expect(await verifyPassword("another long password", row.passwordHash)).toBe(true);
  expect(await verifyPassword(PASSWORD, row.passwordHash)).toBe(false);
  const left = await db.select().from(signInTokens);
  expect(left.map((t) => t.tokenHash)).toEqual(["t3"]);
  await expect(setPassword(a.id, "short", db)).rejects.toMatchObject({ status: 400 });
});

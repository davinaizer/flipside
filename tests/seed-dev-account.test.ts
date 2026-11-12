import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("seedDevAccount creates the account once and gives it the seeded profiles", async () => {
  vi.stubEnv(
    "DATABASE_URL",
    await freshDatabase(inject("testDatabaseUrl"), "flipside_dev_account"),
  );
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const { accounts, profiles } = await import("@/server/db/schema");
  const { seedProfiles, seedDevAccount } = await import("@/server/seed");
  const db = getDb();
  await runMigrations(db);
  await seedProfiles(db);
  expect(await seedDevAccount(db, {})).toBeNull();
  const env = {
    DEV_ACCOUNT_EMAIL: "dev@flipside.local",
    DEV_ACCOUNT_PASSWORD: "a long enough password",
  };
  const id = await seedDevAccount(db, env);
  expect(await seedDevAccount(db, env)).toBe(id);
  expect(await db.select().from(accounts)).toHaveLength(1);
  expect((await db.select().from(profiles)).every((p) => p.accountId === id)).toBe(true);
});

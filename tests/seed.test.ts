import { expect, test, vi, inject } from "vitest";
import { eq } from "drizzle-orm";
import { freshDatabase } from "./helpers/db";

test("seed twice leaves exactly Davi and Nicole; a third profile needs no code change", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_seed");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const { seedProfiles } = await import("@/server/seed");
  const { profiles } = await import("@/server/db/schema");
  const { DEFAULT_SETTINGS } = await import("@/shared/settings");
  const { AVATAR_IDS } = await import("@/shared/avatars");
  const db = getDb();
  await runMigrations(db);
  await seedProfiles(db);
  await seedProfiles(db);

  const rows = await db.select().from(profiles);
  expect(rows.map((r) => r.name).sort()).toEqual(["Davi", "Nicole"]);
  expect(new Set(rows.map((r) => r.avatar)).size).toBe(2);
  for (const r of rows) {
    expect(AVATAR_IDS).toContain(r.avatar);
    expect(r.timezone).toBe("Europe/London");
    expect(r.dayStartHour).toBe(7);
    expect(r.settings).toEqual(DEFAULT_SETTINGS);
  }

  await db.insert(profiles).values({
    name: "Third",
    avatar: AVATAR_IDS[2],
    accent: "primary",
    timezone: "Europe/London",
    dayStartHour: 7,
  });
  await seedProfiles(db);
  expect(await db.select().from(profiles)).toHaveLength(3);

  // A seed profile left with a retired emoji-set id is repaired; a valid choice is kept.
  await db.update(profiles).set({ avatar: "fox" }).where(eq(profiles.name, "Davi"));
  await db.update(profiles).set({ avatar: AVATAR_IDS[5] }).where(eq(profiles.name, "Nicole"));
  await seedProfiles(db);
  const byName = Object.fromEntries(
    (await db.select().from(profiles)).map((r) => [r.name, r.avatar]),
  );
  expect(byName.Davi).toBe(AVATAR_IDS[0]);
  expect(byName.Nicole).toBe(AVATAR_IDS[5]);
});

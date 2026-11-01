import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb } from "./client";

/** Applies pending migrations. Safe to run repeatedly: applied ones are skipped. */
export async function runMigrations(db: ReturnType<typeof getDb> = getDb()): Promise<void> {
  await migrate(db, {
    migrationsFolder: "./drizzle",
    migrationsTable: "schema_migrations",
    migrationsSchema: "public",
  });
}

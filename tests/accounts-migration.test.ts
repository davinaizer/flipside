import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, inject, test } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { freshDatabase } from "./helpers/db";

const options = { migrationsTable: "schema_migrations", migrationsSchema: "public" };

test("the accounts migration applies over seeded profiles and decks and leaves account_id null", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_accounts_migration");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(sql);

    // A copy of the migrations folder that stops before the accounts migration.
    const before = mkdtempSync(join(tmpdir(), "flipside-migrations-"));
    cpSync("./drizzle", before, { recursive: true });
    const journalPath = join(before, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.filter((e: { tag: string }) => e.tag === "0000_init");
    writeFileSync(journalPath, JSON.stringify(journal));
    await migrate(db, { ...options, migrationsFolder: before });

    await sql`insert into profiles (id, name, avatar, accent, timezone, day_start_hour)
      values (gen_random_uuid(), 'Davi', 'a', 'x', 'Europe/London', 7),
             (gen_random_uuid(), 'Nicole', 'b', 'y', 'Europe/London', 7)`;
    await sql`insert into decks (id, owner_profile_id, name)
      select gen_random_uuid(), id, 'Science' from profiles`;

    await migrate(db, { ...options, migrationsFolder: "./drizzle" });

    const profiles = await sql`select account_id from profiles`;
    expect(profiles).toHaveLength(2);
    expect(profiles.every((p) => p.account_id === null)).toBe(true);
    expect(await sql`select 1 from decks`).toHaveLength(2);

    const [acc] = await sql`insert into accounts (id, email, password_hash)
      values (gen_random_uuid(), 'a@b.c', 'h') returning id`;
    await expect(
      sql`insert into accounts (id, email, password_hash) values (gen_random_uuid(), 'a@b.c', 'h')`,
    ).rejects.toThrow();
    await sql`insert into sign_in_tokens (id, account_id, token_hash, expires_at)
      values (gen_random_uuid(), ${acc.id}, 't', now())`;
    await expect(
      sql`insert into sign_in_tokens (id, account_id, token_hash, expires_at)
        values (gen_random_uuid(), ${acc.id}, 't', now())`,
    ).rejects.toThrow();
    const idx = await sql`select 1 from pg_indexes where tablename='sign_in_attempts'
      and indexdef like '%(email, attempted_at)%'`;
    expect(idx).toHaveLength(1);
  } finally {
    await sql.end();
  }
});

import { expect, test, inject, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freshDatabase } from "./helpers/db";

test("import:cli imports through the service and prints the report; unknown profile fails", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_import_cli");
  const dir = await mkdtemp(join(tmpdir(), "flipside-cli-"));
  const env = { ...process.env, DATABASE_URL: url, IMAGE_STORE_PATH: join(dir, "images") };
  const run = (...args: string[]) =>
    spawnSync(
      "node",
      ["--import", "./scripts/register-alias.mjs", "scripts/import-cli.ts", ...args],
      { env, encoding: "utf8" },
    );

  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const { seedProfiles } = await import("@/server/seed");
  const db = getDb();
  await runMigrations(db);
  await seedProfiles(db);

  const file = join(dir, "cards.csv");
  await writeFile(file, "id,topic,front,back\nc1,T,Q1,A1\nc2,T,Q2,A2\n");

  const ok = run(file, "--profile", "Davi", "--name", "CLI deck");
  expect(ok.status, ok.stderr).toBe(0);
  expect(JSON.parse(ok.stdout)).toMatchObject({ added: 2, updated: 0, skipped: 0 });
  const { decks } = await import("@/server/db/schema");
  expect((await db.select().from(decks)).map((d) => d.name)).toEqual(["CLI deck"]);

  const bad = run(file, "--profile", "Nobody");
  expect(bad.status).not.toBe(0);
  expect(bad.stderr).toContain("Unknown profile");
  expect(await db.select().from(decks)).toHaveLength(1);
}, 20000);

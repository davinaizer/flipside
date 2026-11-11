import { expect, test, inject, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freshDatabase } from "./helpers/db";

test("import:cli accepts a zip over the 4 MB web limit (the limit applies to HTTP uploads only)", async () => {
  const { WEB_IMPORT_MAX_BYTES } = await import("@/shared/constants");
  const { zipSync, strToU8 } = await import("fflate");
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_import_cli_big");
  const dir = await mkdtemp(join(tmpdir(), "flipside-cli-big-"));
  const env = {
    ...process.env,
    DATABASE_URL: url,
    IMAGE_STORE_DRIVER: "fs",
    IMAGE_STORE_PATH: join(dir, "images"),
  };

  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const { seedProfiles } = await import("@/server/seed");
  const db = getDb();
  await runMigrations(db);
  await seedProfiles(db);

  // Stored (level 0) filler keeps the zip above the web limit while far inside the zip limits.
  const filler = new Uint8Array(WEB_IMPORT_MAX_BYTES + 1024 * 1024).fill(7);
  const zip = zipSync(
    { "big.csv": strToU8("id,topic,front,back\nc1,T,Q1,A1\n"), "filler.bin": filler },
    { level: 0 },
  );
  expect(zip.byteLength).toBeGreaterThan(WEB_IMPORT_MAX_BYTES);
  const file = join(dir, "big.zip");
  await writeFile(file, zip);

  const r = spawnSync(
    "node",
    [
      "--import",
      "./scripts/register-alias.mjs",
      "scripts/import-cli.ts",
      file,
      "--profile",
      "Davi",
    ],
    { env, encoding: "utf8" },
  );
  expect(r.status, r.stderr).toBe(0);
  expect(JSON.parse(r.stdout)).toMatchObject({ added: 1 });
}, 30000);

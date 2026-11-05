import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, inject, it, vi } from "vitest";
import { freshDatabase } from "../helpers/db";

// PRD section 13 drill: back up, destroy, restore; card_state, review_log, stats and image bytes match.
const DB = "flipside_restore_drill";
const container = inject("testContainer");
let root: string;
let images: string;
let out: string;

const env = () => ({
  ...process.env,
  BACKUP_DIR: out,
  IMAGE_STORE_PATH: images,
  PG_CONTAINER: container,
  PG_DB: DB,
});
const sh = (script: string, ...args: string[]) =>
  spawnSync("bash", [`scripts/${script}.sh`, ...args], { encoding: "utf8", env: env() });
const psql = (sql: string) => {
  const r = spawnSync(
    "podman",
    ["exec", container, "psql", "-U", "flipside", "-d", DB, "-h", "127.0.0.1", "-tA", "-c", sql],
    { encoding: "utf8" },
  );
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};
const imageBytes = () =>
  Object.fromEntries(
    readdirSync(images).map((f) => [
      f,
      createHash("sha256")
        .update(readFileSync(join(images, f)))
        .digest("hex"),
    ]),
  );

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "flipside-drill-"));
  images = join(root, "images");
  out = join(root, "backups");
  mkdirSync(images);
});
afterAll(() => {
  vi.useRealTimers();
  rmSync(root, { recursive: true, force: true });
});

it("restores card_state, review_log, stats and image bytes after the data is destroyed", async () => {
  vi.stubEnv("DATABASE_URL", await freshDatabase(inject("testDatabaseUrl"), DB));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const { images: imagesTable, cards } = await import("@/server/db/schema");
  const { seedStatsHistory, history } = await import("../helpers/stats-history");
  const route = await import("@/app/api/v1/stats/route");
  const db = getDb();
  await runMigrations(db);
  const { me, cardIds } = await seedStatsHistory(db);

  // An image row with real (binary) bytes on disk, attached to a card.
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 255, 1, 254, 2, 253]);
  const sha = createHash("sha256").update(bytes).digest("hex");
  writeFileSync(join(images, `${sha}.png`), bytes);
  const [img] = await db
    .insert(imagesTable)
    .values({
      ownerProfileId: me.id,
      sha256: sha,
      mime: "image/png",
      bytes: bytes.length,
      storageKey: `${sha}.png`,
    })
    .returning();
  const { eq } = await import("drizzle-orm");
  await db
    .update(cards)
    .set({ frontImageId: img!.id })
    .where(eq(cards.id, Object.values(cardIds)[0]!));

  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(history.now));
  const snapshot = async () => {
    const res = await route.GET(
      new Request("http://local/api/v1/stats?range=month", { headers: { "x-profile-id": me.id } }),
    );
    expect(res.status).toBe(200);
    return {
      stats: await res.json(),
      cardState: psql("select coalesce(json_agg(t order by card_id), '[]') from card_state t"),
      reviewLog: psql("select coalesce(json_agg(t order by id), '[]') from review_log t"),
      images: psql("select coalesce(json_agg(t order by id), '[]') from images t"),
      files: imageBytes(),
    };
  };
  const before = await snapshot();
  expect(JSON.parse(before.reviewLog).length).toBeGreaterThan(0);
  expect(JSON.parse(before.cardState).length).toBeGreaterThan(0);

  vi.useRealTimers();
  const backup = sh("backup");
  expect(backup.status, backup.stderr).toBe(0);
  const folder = join(
    out,
    readdirSync(out).find((d) => d.startsWith("flipside-"))!,
  );

  // Refuses while data is present, and leaves it alone.
  const refused = sh("restore", folder);
  expect(refused.status).toBe(3);
  expect(psql("select count(*) from review_log")).not.toBe("0");

  // Destroy the database contents and the image files.
  psql("drop schema public cascade; drop schema if exists drizzle cascade; create schema public");
  rmSync(images, { recursive: true });
  mkdirSync(images);

  const restored = sh("restore", folder);
  expect(restored.status, restored.stderr).toBe(0);

  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(history.now));
  expect(await snapshot()).toEqual(before);

  // Overwriting existing data works with the explicit flag.
  vi.useRealTimers();
  expect(sh("restore", folder, "--yes").status).toBe(0);
}, 120_000);

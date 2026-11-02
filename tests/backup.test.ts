import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, inject, it } from "vitest";

// Runs scripts/backup.sh against the disposable test container and temp folders.
let root: string;
let images: string;
let out: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "flipside-backup-"));
  images = join(root, "images");
  out = join(root, "backups");
  mkdirSync(images);
  writeFileSync(join(images, "a.png"), "img");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function run(env: Record<string, string> = {}) {
  return spawnSync("bash", ["scripts/backup.sh"], {
    encoding: "utf8",
    env: {
      ...process.env,
      BACKUP_DIR: out,
      IMAGE_STORE_PATH: images,
      PG_CONTAINER: inject("testContainer"),
      PG_DB: "flipside_test",
      ...env,
    },
  });
}

const dirs = () => readdirSync(out);

describe("backup.sh", () => {
  it("writes a dated folder with a dump and an images archive", () => {
    const r = run();
    expect(r.status, r.stderr).toBe(0);
    const [d] = dirs();
    expect(d).toMatch(/^flipside-\d{4}-\d{2}-\d{2}-\d{6}$/);
    expect(dirs()).toHaveLength(1);
    expect(readdirSync(join(out, d)).sort()).toEqual(["database.dump", "images.tar.gz"]);
    const list = execFileSync("tar", ["-tzf", join(out, d, "images.tar.gz")], { encoding: "utf8" });
    expect(list).toContain("a.png");
  });

  it("removes only backups older than 14 days", () => {
    mkdirSync(out);
    const old = join(out, "flipside-2020-01-01-000000");
    const recent = join(out, "flipside-2020-01-02-000000");
    const other = join(out, "keep-me");
    for (const p of [old, recent, other]) mkdirSync(p);
    const days = (n: number) => new Date(Date.now() - n * 86400_000);
    utimesSync(old, days(15), days(15));
    utimesSync(recent, days(13), days(13));
    utimesSync(other, days(30), days(30));
    const r = run();
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(recent)).toBe(true);
    expect(existsSync(other)).toBe(true);
  });

  it("fails non-zero and leaves no folder when the dump fails", () => {
    const r = run({ PG_CONTAINER: "flipside-no-such-container" });
    expect(r.status).not.toBe(0);
    expect(dirs()).toEqual([]);
  });

  it("refuses a backup folder inside the repository", () => {
    const r = run({ BACKUP_DIR: join(process.cwd(), "data", "backup-test") });
    expect(r.status).toBe(2);
    rmSync(join(process.cwd(), "data", "backup-test"), { recursive: true, force: true });
  });
});

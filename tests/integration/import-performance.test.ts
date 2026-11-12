import { asProfile } from "../factories";
import { expect, test, vi, inject } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freshDatabase } from "../helpers/db";

// PRD section 16: a 2,000-row import (the IMPORT_MAX_ROWS limit) finishes in under 30 s.
// The figure is logged ("PERF import ...") for docs/progress.md.
test("a 2,000-row CSV imports in under 30 s", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_import_perf");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", await mkdtemp(join(tmpdir(), "flipside-perf-")));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("../factories");
  const owner = await f.createProfile(db, { name: "Nicole" });
  const schema = await import("@/server/db/schema");
  const imports = await import("@/app/api/v1/imports/route");

  const lines = ["id,topic,front,back,front_image,back_image"];
  for (let i = 1; i <= 2000; i++) {
    lines.push(
      `perf-${i},Topic ${i % 10},"Question ${i}?","Point one ${i}\nPoint two ${i}\nPoint three ${i}",,`,
    );
  }
  const form = new FormData();
  form.set("file", new File([lines.join("\n")], "perf.csv", { type: "text/csv" }));
  form.set("name", "Perf deck");
  form.set("color", "sage");
  form.set("answerStyle", "bullets");

  const t0 = performance.now();
  const res = await imports.POST(
    new Request("http://x/api/v1/imports", {
      method: "POST",
      body: form,
      headers: asProfile(owner.id),
    }),
  );
  const ms = Math.round(performance.now() - t0);
  console.log(`PERF import 2000 rows: ${ms} ms`);

  expect(res.status).toBe(201);
  expect(await res.json()).toMatchObject({ added: 2000 });
  expect(await db.select().from(schema.cards)).toHaveLength(2000);
  expect(ms).toBeLessThan(30_000);
}, 60_000);

import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { freshDatabase } from "./helpers/db";

test("dry run previews CSV and zip input and saves nothing", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_imports_api");
  const store = await mkdtemp(join(tmpdir(), "flipside-imp-"));
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", store);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const p = await f.createProfile(db, { name: "A" });
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 1, onnotice: () => {} });

  /** Row count of every public table plus the number of files in the image folder. */
  const snapshot = async () => {
    const tables = await sql<
      { t: string }[]
    >`select tablename as t from pg_tables where schemaname = 'public' order by 1`;
    const counts: Record<string, number> = {};
    for (const { t } of tables)
      counts[t] = (await sql.unsafe(`select count(*)::int as n from "${t}"`))[0].n;
    return { counts, files: await readdir(store, { recursive: true }) };
  };
  const before = await snapshot();

  const route = await import("@/app/api/v1/imports/route");
  const post = (bytes: Uint8Array, query = "?dryRun=true", profile = p.id) => {
    const form = new FormData();
    form.set("file", new File([bytes as BlobPart], "deck.bin"));
    return route.POST(
      new Request(`http://x/api/v1/imports${query}`, {
        method: "POST",
        body: form,
        headers: asProfile(profile),
      }),
    );
  };

  // CSV with a missing id column value, an empty field, a duplicate and an unknown column.
  const csv = [
    "id,topic,front,back,extra",
    "a1,T1,Q1,A1,x",
    "a2,T1,Q2,A2,x",
    "a1,T1,Q3,A3,x",
    "a4,T2,,A4,x",
    "a5,T2,Q5,A5,x",
  ].join("\n");
  const res = await post(strToU8(csv));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.kind).toBe("csv");
  expect(body.columns).toEqual(["id", "topic", "front", "back"]);
  expect(body.unknownColumns).toEqual(["extra"]);
  expect(body.rowCount).toBe(5);
  expect(body.validCount).toBe(3);
  expect(body.skippedCount).toBe(2);
  expect(body.firstCards.map((c: { id: string }) => c.id)).toEqual(["a1", "a2", "a5"]);
  expect(body.errors.map((e: { row: number }) => e.row).sort()).toEqual([4, 5]);
  expect(body.warnings.some((w: { code: string }) => w.code === "unknown_column")).toBe(true);

  // The school deck as a zip: images are counted and checked.
  const zipBytes = new Uint8Array(
    await readFile(join(process.cwd(), "fixtures/science-w2-deck.zip")),
  );
  const zres = await post(zipBytes);
  expect(zres.status).toBe(200);
  const z = await zres.json();
  expect(z.kind).toBe("zip");
  expect(z.firstCards).toHaveLength(3);
  expect(z.imageCount).toBeGreaterThan(0);
  expect(z.errors).toEqual([]);

  // A zip naming an image it lacks warns but still previews.
  const missing = zipSync({ "d.csv": strToU8("topic,front,back,front_image\nT,Q,A,nope.png\n") });
  const m = await (await post(missing)).json();
  expect(m.warnings.map((w: { code: string }) => w.code)).toContain("missing_image");

  // Blocked files return the error format.
  const cases: [string, Uint8Array, string][] = [
    ["missing column", strToU8("topic,front\nT,Q\n"), "missing_column"],
    ["empty", strToU8(""), "empty_file"],
    ["unsafe zip", zipSync({ "../evil.csv": strToU8("topic,front,back\nT,Q,A\n") }), "unsafe_path"],
    ["no csv", zipSync({ "a.txt": strToU8("hi") }), "no_csv"],
    ["bad zip", new Uint8Array([0x50, 0x4b, 1, 2, 3, 4]), "unreadable_zip"],
  ];
  for (const [name, bytes, code] of cases) {
    const r = await post(bytes);
    expect(r.status, name).toBe(422);
    const e = (await r.json()).error;
    expect(e.code).toBe("import_blocked");
    expect(typeof e.message).toBe("string");
    expect(
      e.details.map((d: { code: string }) => d.code),
      name,
    ).toContain(code);
  }

  // One byte over the web limit is refused with the too_large shape; exactly the limit is read.
  const { WEB_IMPORT_MAX_BYTES } = await import("@/shared/constants");
  for (const query of ["?dryRun=true", ""]) {
    const big = await post(new Uint8Array(WEB_IMPORT_MAX_BYTES + 1), query);
    expect(big.status).toBe(422);
    const bigError = (await big.json()).error;
    expect(bigError.code).toBe("import_blocked");
    expect(bigError.details[0].code).toBe("too_large");
    expect(bigError.message).toContain("4 MB");
    expect(bigError.message).toContain("pnpm import:cli");
  }
  expect((await post(new Uint8Array(WEB_IMPORT_MAX_BYTES))).status).toBe(422);

  // Request problems.
  const noFile = await route.POST(
    new Request("http://x/?dryRun=true", {
      method: "POST",
      body: new FormData(),
      headers: asProfile(p.id),
    }),
  );
  expect(noFile.status).toBe(400);
  expect(
    (await post(strToU8(csv), "?dryRun=true", "00000000-0000-4000-8000-000000000000")).status,
  ).toBe(401);
  // A commit without deck details is a bad request (full commit tests: imports-commit.test.ts).
  const noDetails = await post(strToU8(csv), "");
  expect(noDetails.status).toBe(400);
  // Details are {path, message} like the other services.
  const { error } = await noDetails.json();
  expect(error.code).toBe("invalid_request");
  expect(error.details.length).toBeGreaterThan(0);
  for (const d of error.details) expect(Object.keys(d).sort()).toEqual(["message", "path"]);

  expect(await snapshot()).toEqual(before);
  await sql.end();
});

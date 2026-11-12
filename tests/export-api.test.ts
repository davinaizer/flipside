import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, zipSync, strToU8 } from "fflate";
import { freshDatabase } from "./helpers/db";

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

test("export is a zip of CSV plus images, 404 for another profile, and re-imports unchanged (I6)", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_export");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", await mkdtemp(join(tmpdir(), "flipside-export-")));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const a = await f.createProfile(db, { name: "A" });
  const b = await f.createProfile(db, { name: "B" });
  const imports = await import("@/app/api/v1/imports/route");
  const exporter = await import("@/app/api/v1/decks/[id]/export/route");
  const template = await import("@/app/api/v1/imports/template/route");

  const post = (bytes: Uint8Array, fields: Record<string, string>) => {
    const form = new FormData();
    form.set("file", new File([bytes as BlobPart], "deck.zip"));
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    return imports.POST(
      new Request("http://x/api/v1/imports", {
        method: "POST",
        body: form,
        headers: asProfile(a.id),
      }),
    );
  };
  const csv =
    'id,topic,front,back,front_image\nc1,T1,"Q, one","A1\nA2",pic.png\nc2,T2,Q2,"say ""hi""",\n';
  const first = await post(zipSync({ "d.csv": strToU8(csv), "pic.png": PNG }), {
    name: "Science Deck",
    color: "sage",
    answerStyle: "bullets",
  });
  const { deckId } = await first.json();

  const get = (id: string, profile: string) =>
    exporter.GET(new Request("http://x", { headers: asProfile(profile) }), {
      params: Promise.resolve({ id }),
    });

  expect((await get(deckId, b.id)).status).toBe(404);
  expect((await get("nope", a.id)).status).toBe(404);

  const res = await get(deckId, a.id);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/zip");
  expect(res.headers.get("content-disposition")).toContain("Science-Deck.zip");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const files = unzipSync(bytes);
  const names = Object.keys(files);
  expect(names).toContain("deck.csv");
  expect(names.filter((n) => n.startsWith("images/"))).toHaveLength(1);
  expect(Buffer.from(files[names.find((n) => n.startsWith("images/"))!])).toEqual(Buffer.from(PNG));

  const again = await post(bytes, { deckId });
  expect(again.status).toBe(201);
  expect(await again.json()).toMatchObject({
    deckId,
    added: 0,
    updated: 0,
    unchanged: 2,
    skipped: 0,
    missing: [],
  });

  const t = template.GET();
  expect(t.headers.get("content-type")).toContain("text/csv");
});

import { asProfile } from "../factories";
import { expect, test, vi, inject } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { freshDatabase } from "../helpers/db";

// AC2: the school deck imports whole, and every card's images serve the file its CSV row names.
test("importing the school zip creates 16 cards, 4 topics and 7 correct images", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_school_deck");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", await mkdtemp(join(tmpdir(), "flipside-school-")));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("../factories");
  const owner = await f.createProfile(db, { name: "Nicole" });
  const schema = await import("@/server/db/schema");
  const imports = await import("@/app/api/v1/imports/route");
  const imageRoute = await import("@/app/api/v1/images/[id]/route");
  const { parseCsv } = await import("@/domain/csv-import");

  const zipBytes = new Uint8Array(
    await readFile(join(process.cwd(), "fixtures/science-w2-deck.zip")),
  );
  const form = new FormData();
  form.set("file", new File([zipBytes as BlobPart], "science-w2-deck.zip"));
  form.set("name", "Science week 2");
  form.set("color", "sage");
  form.set("answerStyle", "bullets");
  const res = await imports.POST(
    new Request("http://x/api/v1/imports", {
      method: "POST",
      body: form,
      headers: asProfile(owner.id),
    }),
  );
  expect(res.status).toBe(201);
  const out = await res.json();
  expect(out).toMatchObject({ added: 16, imageCount: 7 });
  expect(out.warnings.filter((w: { code: string }) => w.code.includes("image"))).toEqual([]);

  const cards = await db.select().from(schema.cards);
  expect(cards).toHaveLength(16);
  expect(new Set(cards.map((c) => c.topic)).size).toBe(4);
  expect(await db.select().from(schema.decks)).toHaveLength(1);
  expect(await db.select().from(schema.images)).toHaveLength(7);

  const files = unzipSync(zipBytes);
  const byBase = (name: string) => {
    const key = Object.keys(files).find(
      (k) => k.split("/").pop()!.toLowerCase() === name.toLowerCase(),
    );
    if (!key) throw new Error(`zip has no ${name}`);
    return files[key];
  };
  const csvKey = Object.keys(files).find((k) => k.endsWith(".csv"))!;
  const rows = parseCsv(new TextDecoder().decode(files[csvKey])).cards;
  expect(rows).toHaveLength(16);

  const serve = async (imageId: string | null, expected: Uint8Array) => {
    expect(imageId).not.toBeNull();
    const r = await imageRoute.GET(new Request("http://x/", { headers: asProfile(owner.id) }), {
      params: Promise.resolve({ id: imageId! }),
    });
    expect(r.status).toBe(200);
    expect(Buffer.from(await r.arrayBuffer()).equals(Buffer.from(expected))).toBe(true);
  };
  let checked = 0;
  for (const row of rows) {
    const card = cards.find((c) => c.externalId === row.id)!;
    for (const [name, imageId] of [
      [row.frontImage, card.frontImageId],
      [row.backImage, card.backImageId],
    ] as const) {
      if (name) {
        await serve(imageId, byBase(name));
        checked++;
      } else {
        expect(imageId).toBeNull();
      }
    }
  }
  expect(checked).toBe(7);
  // The two question-side images.
  for (const id of ["sci-w2-08", "sci-w2-09"]) {
    expect(cards.find((c) => c.externalId === id)!.frontImageId).not.toBeNull();
  }
});

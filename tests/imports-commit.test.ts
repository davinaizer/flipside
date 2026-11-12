import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { freshDatabase } from "./helpers/db";

// 1x1 PNG, and a second one with different bytes (extra trailing chunk is ignored by the sniffer).
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const PNG2 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/9lq5wgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

test("commit saves a new deck, cards, images and an import run in one transaction", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_imports_commit");
  const store = await mkdtemp(join(tmpdir(), "flipside-commit-"));
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", store);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const a = await f.createProfile(db, { name: "A" });
  const b = await f.createProfile(db, { name: "B" });
  const schema = await import("@/server/db/schema");
  const route = await import("@/app/api/v1/imports/route");

  const post = (bytes: Uint8Array, fields: Record<string, string>, profile = a.id) => {
    const form = new FormData();
    form.set("file", new File([bytes as BlobPart], "deck.zip"));
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    return route.POST(
      new Request("http://x/api/v1/imports", {
        method: "POST",
        body: form,
        headers: asProfile(profile),
      }),
    );
  };
  const counts = async () => ({
    decks: (await db.select().from(schema.decks)).length,
    cards: (await db.select().from(schema.cards)).length,
    images: (await db.select().from(schema.images)).length,
    runs: (await db.select().from(schema.importRuns)).length,
  });
  const details = { name: "Science", group: "Year 7", color: "sage", answerStyle: "bullets" };
  const csv =
    "id,topic,front,back,front_image,back_image\n" +
    'c1,T1,Q1,"line one\nline two",one.png,same.png\n' +
    "c2,T1,Q2,A2,copy.png,\n" +
    "c3,T2,,A3,,\n" +
    "c4,T2,Q4,A4,,nope.png\n";
  const zip = zipSync({
    "d.csv": strToU8(csv),
    "images/one.png": PNG,
    "images/same.png": PNG2,
    "images/copy.png": PNG,
  });

  // Server revalidates: bad details and a blocked file save nothing.
  expect((await post(zip, { ...details, name: " " })).status).toBe(400);
  expect((await post(zip, { ...details, color: "red" })).status).toBe(400);
  expect((await post(strToU8("topic,front\nT,Q\n"), details)).status).toBe(422);
  expect(await counts()).toEqual({ decks: 0, cards: 0, images: 0, runs: 0 });

  // Success.
  const res = await post(zip, details);
  expect(res.status).toBe(201);
  const out = await res.json();
  expect(out).toMatchObject({ added: 3, updated: 0, skipped: 1, imageCount: 2 });
  const [deck] = await db.select().from(schema.decks);
  expect(deck).toMatchObject({
    id: out.deckId,
    ownerProfileId: a.id,
    name: "Science",
    groupName: "Year 7",
    color: "sage",
    answerStyle: "bullets",
  });
  const rows = (await db.select().from(schema.cards)).sort((x, y) => x.position - y.position);
  expect(rows.map((c) => [c.externalId, c.position])).toEqual([
    ["c1", 0],
    ["c2", 1],
    ["c4", 2],
  ]);
  expect(rows[0].back).toBe("line one\nline two");
  // Same bytes under two names: one image row and one file.
  expect(await counts()).toEqual({ decks: 1, cards: 3, images: 2, runs: 1 });
  expect(rows[0].frontImageId).toBe(rows[1].frontImageId);
  expect(rows[2].backImageId).toBeNull();
  expect(
    (await readdir(store, { recursive: true })).filter((n) => n.endsWith(".png")),
  ).toHaveLength(2);
  const [run] = await db.select().from(schema.importRuns);
  expect(run).toMatchObject({
    profileId: a.id,
    deckId: deck.id,
    filename: "deck.zip",
    rowsTotal: 4,
    rowsAdded: 3,
    rowsUpdated: 0,
    rowsSkipped: 1,
  });
  expect((run.warnings as { code: string }[]).map((w) => w.code)).toContain("missing_image");

  // Another profile gets its own image rows for the same picture.
  expect((await post(zip, details, b.id)).status).toBe(201);
  const imgs = await db.select().from(schema.images);
  expect(imgs).toHaveLength(4);
  const bCards = await db.select().from(schema.cards);
  const aImages = new Set(imgs.filter((i) => i.ownerProfileId === a.id).map((i) => i.id));
  const bDeck = (await db.select().from(schema.decks)).find((d) => d.ownerProfileId === b.id)!;
  for (const c of bCards.filter((c) => c.deckId === bDeck.id)) {
    expect(aImages.has(c.frontImageId ?? "")).toBe(false);
    expect(aImages.has(c.backImageId ?? "")).toBe(false);
  }
  expect(
    (await readdir(store, { recursive: true })).filter((n) => n.endsWith(".png")),
  ).toHaveLength(2);

  // A failure mid-way (second file write) leaves no rows.
  const before = await counts();
  const { getImageStore } = await import("@/server/images/store");
  const spy = vi.spyOn(getImageStore(), "put").mockRejectedValueOnce(new Error("disk full"));
  const other = zipSync({
    "d.csv": strToU8("id,topic,front,back,front_image\nz1,T,Q,A,x.png\n"),
    "x.png": Uint8Array.from([...PNG, 0]),
  });
  await expect(post(other, details)).rejects.toThrow("disk full");
  spy.mockRestore();
  expect(await counts()).toEqual(before);
});

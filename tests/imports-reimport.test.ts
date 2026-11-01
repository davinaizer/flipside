import { expect, test, vi, inject } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { freshDatabase } from "./helpers/db";

const PNG = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64"),
);

test("re-import matches cards by id, keeps progress and reports added, updated, unchanged and skipped (AC3)", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_imports_reimport");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", await mkdtemp(join(tmpdir(), "flipside-reimport-")));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const a = await f.createProfile(db, { name: "A" });
  const b = await f.createProfile(db, { name: "B" });
  const schema = await import("@/server/db/schema");
  const route = await import("@/app/api/v1/imports/route");
  const { desc } = await import("drizzle-orm");

  const post = (bytes: Uint8Array, fields: Record<string, string>, profile = a.id) => {
    const form = new FormData();
    form.set("file", new File([bytes as BlobPart], "deck.zip"));
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    return route.POST(new Request("http://x/api/v1/imports", { method: "POST", body: form, headers: { "x-profile-id": profile } }));
  };
  const snapshot = async () => ({
    cards: (await db.select().from(schema.cards)).sort((x, y) => x.position - y.position),
    state: await db.select().from(schema.cardState),
    log: await db.select().from(schema.reviewLog),
  });
  const lastRun = async () => (await db.select().from(schema.importRuns).orderBy(desc(schema.importRuns.createdAt)).limit(1))[0];

  const csv =
    "id,topic,front,back,front_image\n" +
    "c1,T1,Q1,A1,pic.png\n" +
    "c2,T1,Q2,A2,\n" +
    "c3,T2,Q3,\"x\ny\",\n" +
    "c9,T2,,A9,\n";
  const zip = zipSync({ "d.csv": strToU8(csv), "pic.png": PNG });
  const first = await post(zip, { name: "Science", color: "sage", answerStyle: "bullets" });
  expect(first.status).toBe(201);
  const { deckId } = await first.json();
  const [c1, c2] = (await snapshot()).cards;

  // Progress from factories.
  await f.createCardState(db, a.id, c1.id, { box: 4, dueDate: "2026-12-01", reps: 7, lapses: 1, lastGrade: "got_it" });
  await f.createCardState(db, a.id, c2.id, { box: 2, dueDate: "2026-11-05", reps: 2 });
  await f.createReviewLog(db, a.id, c1.id);
  await f.createReviewLog(db, a.id, c1.id, { reviewedAt: new Date("2026-01-03T09:00:00Z"), boxBefore: 2, boxAfter: 3 });
  const before = await snapshot();

  // The same file adds nothing and changes nothing; deck details are not needed.
  const same = await post(zip, { deckId });
  expect(same.status).toBe(201);
  expect(await same.json()).toMatchObject({ deckId, added: 0, updated: 0, unchanged: 3, skipped: 1, missing: [] });
  expect(await snapshot()).toEqual(before);
  expect(await lastRun()).toMatchObject({ deckId, rowsTotal: 4, rowsAdded: 0, rowsUpdated: 0, rowsSkipped: 1 });

  // Edited back on c1 (CSV only, so its picture is kept), c2 dropped, c4 new.
  const edited =
    "id,topic,front,back,front_image\n" +
    "c1,T1,Q1,\"A1 edited\nsecond point\",pic.png\n" +
    "c3,T2,Q3,\"x\ny\",\n" +
    "c4,T3,Q4,A4,\n";
  const res = await post(strToU8(edited), { deckId });
  expect(res.status).toBe(201);
  const out = await res.json();
  expect(out).toMatchObject({ deckId, added: 1, updated: 1, unchanged: 1, skipped: 0, missing: ["c2"] });
  expect(out.warnings).toContainEqual(expect.objectContaining({ code: "card_not_in_file", message: expect.stringContaining("c2") }));

  const after = await snapshot();
  expect(after.cards.map((c) => [c.externalId, c.position])).toEqual([["c1", 0], ["c2", 1], ["c3", 2], ["c4", 3]]);
  const c1After = after.cards[0];
  expect(c1After).toMatchObject({ id: c1.id, back: "A1 edited\nsecond point", frontImageId: c1.frontImageId });
  expect(c1.frontImageId).not.toBeNull();
  expect(after.cards[1]).toEqual(before.cards[1]); // missing id kept as it was
  expect(after.cards[3]).toMatchObject({ deckId, topic: "T3", front: "Q4" });
  expect(after.state).toEqual(before.state); // box, due date kept
  expect(after.log).toEqual(before.log); // history kept

  const run = await lastRun();
  expect(run).toMatchObject({ deckId, profileId: a.id, rowsTotal: 3, rowsAdded: 1, rowsUpdated: 1, rowsSkipped: 0 });
  expect((run.warnings as { code: string }[]).filter((w) => w.code === "card_not_in_file")).toHaveLength(1);

  // Another profile's deck, an unknown id and a malformed id are all 404, and save nothing.
  const runs = (await db.select().from(schema.importRuns)).length;
  expect((await post(strToU8(edited), { deckId }, b.id)).status).toBe(404);
  expect((await post(strToU8(edited), { deckId: crypto.randomUUID() })).status).toBe(404);
  expect((await post(strToU8(edited), { deckId: "nope" })).status).toBe(404);
  expect(await snapshot()).toEqual(after);
  expect((await db.select().from(schema.importRuns)).length).toBe(runs);
});

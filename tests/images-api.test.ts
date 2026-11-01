import { expect, test, vi, inject } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freshDatabase } from "./helpers/db";

test("images are served to their owner with cache headers and 304", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_images_api");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("IMAGE_STORE_PATH", await mkdtemp(join(tmpdir(), "flipside-img-")));
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { images } = await import("@/server/db/schema");
  const { getImageStore } = await import("@/server/images/store");

  const a = await f.createProfile(db, { name: "A" });
  const b = await f.createProfile(db, { name: "B" });
  const sha = "a".repeat(64);
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const key = `images/${sha}.png`;
  await getImageStore().put(key, bytes, "image/png");
  const [img] = await db
    .insert(images)
    .values({ ownerProfileId: a.id, sha256: sha, mime: "image/png", bytes: bytes.length, storageKey: key })
    .returning();
  const [lost] = await db
    .insert(images)
    .values({ ownerProfileId: a.id, sha256: "b".repeat(64), mime: "image/png", bytes: 1, storageKey: "images/missing.png" })
    .returning();

  const route = await import("@/app/api/v1/images/[id]/route");
  const req = (p: string, h: Record<string, string> = {}) =>
    new Request("http://x/", { headers: { "x-profile-id": p, ...h } });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  const ok = await route.GET(req(a.id), ctx(img.id));
  expect(ok.status).toBe(200);
  expect(ok.headers.get("content-type")).toBe("image/png");
  expect(ok.headers.get("x-content-type-options")).toBe("nosniff");
  expect(ok.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
  expect(ok.headers.get("etag")).toBe(`"${sha}"`);
  expect(new Uint8Array(await ok.arrayBuffer())).toEqual(bytes);

  const cached = await route.GET(req(a.id, { "if-none-match": `"${sha}"` }), ctx(img.id));
  expect(cached.status).toBe(304);
  expect(cached.headers.get("etag")).toBe(`"${sha}"`);
  expect(await cached.text()).toBe("");
  const stale = await route.GET(req(a.id, { "if-none-match": '"other"' }), ctx(img.id));
  expect(stale.status).toBe(200);

  const other = await route.GET(req(b.id), ctx(img.id));
  const unknown = await route.GET(req(a.id), ctx("00000000-0000-4000-8000-000000000000"));
  expect(other.status).toBe(404);
  expect(await other.json()).toEqual(await unknown.json());
  expect((await route.GET(req(a.id), ctx("nope"))).status).toBe(404);
  expect((await route.GET(req(a.id), ctx(lost.id))).status).toBe(404);
  // A matching ETag does not leak to another profile.
  expect(
    (await route.GET(req(b.id, { "if-none-match": `"${sha}"` }), ctx(img.id))).status,
  ).toBe(404);
});

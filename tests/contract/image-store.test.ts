import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createDiskImageStore } from "@/server/images/disk-driver";
import {
  getImageStore,
  ImageNotFoundError,
  InvalidImageKeyError,
  type ImageStore,
} from "@/server/images/store";

async function read(stream: ReadableStream<Uint8Array>) {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Add one entry per driver; every driver must pass the same suite.
const dirs: string[] = [];
const drivers: Record<string, () => Promise<ImageStore>> = {
  fs: async () => {
    const dir = await mkdtemp(join(tmpdir(), "flipside-img-"));
    dirs.push(dir);
    return createDiskImageStore(dir);
  },
};
afterAll(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

describe.each(Object.entries(drivers))("ImageStore contract: %s", (_n, make) => {
  const key = "images/abc123.png";
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 1, 2]);

  it("put then get returns the same bytes", async () => {
    const s = await make();
    await s.put(key, bytes, "image/png");
    expect(await read(await s.get(key))).toEqual(bytes);
  });

  it("repeated put is harmless", async () => {
    const s = await make();
    await s.put(key, bytes, "image/png");
    await s.put(key, bytes, "image/png");
    expect(await read(await s.get(key))).toEqual(bytes);
  });

  it("get of a missing key fails cleanly", async () => {
    const s = await make();
    await expect(s.get("images/missing.png")).rejects.toBeInstanceOf(ImageNotFoundError);
  });

  it("delete is idempotent", async () => {
    const s = await make();
    await s.put(key, bytes, "image/png");
    await s.delete(key);
    await s.delete(key);
    await s.delete("images/never-existed.png");
    expect(await s.exists(key)).toBe(false);
  });

  it("exists is accurate", async () => {
    const s = await make();
    expect(await s.exists(key)).toBe(false);
    await s.put(key, bytes, "image/png");
    expect(await s.exists(key)).toBe(true);
  });

  it.each(["../escape.png", "images/../../escape.png", "/etc/passwd", "", "a\0b"])(
    "refuses key %j",
    async (bad) => {
      const s = await make();
      await expect(s.put(bad, bytes, "image/png")).rejects.toBeInstanceOf(InvalidImageKeyError);
      await expect(s.get(bad)).rejects.toBeInstanceOf(InvalidImageKeyError);
      await expect(s.exists(bad)).rejects.toBeInstanceOf(InvalidImageKeyError);
      await expect(s.delete(bad)).rejects.toBeInstanceOf(InvalidImageKeyError);
    },
  );
});

describe("getImageStore", () => {
  it("picks the driver from IMAGE_STORE_DRIVER (fs)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "flipside-img-"));
    dirs.push(dir);
    process.env.IMAGE_STORE_DRIVER = "fs";
    process.env.IMAGE_STORE_PATH = dir;
    process.env.DATABASE_URL ??= "postgres://x";
    const s = getImageStore();
    await s.put("images/x.png", new Uint8Array([1]), "image/png");
    expect(await s.exists("images/x.png")).toBe(true);
  });
});

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/server/env";
import { createVercelBlobImageStore } from "@/server/images/vercel-blob-driver";
import { createDiskImageStore } from "@/server/images/disk-driver";
import {
  getImageStore,
  ImageNotFoundError,
  InvalidImageKeyError,
  type ImageStore,
} from "@/server/images/store";

// In-memory stand-in for @vercel/blob, reset per store. It refuses overwrites like the real one.
const blobs = vi.hoisted(() => ({
  files: new Map<string, Uint8Array>(),
  puts: [] as { key: string; options: Record<string, unknown> }[],
}));
vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();
  return {
    ...actual,
    put: async (key: string, body: Uint8Array, options: Record<string, unknown>) => {
      blobs.puts.push({ key, options });
      if (blobs.files.has(key) && !options.allowOverwrite) throw new Error("already exists");
      blobs.files.set(key, new Uint8Array(body));
      return { pathname: key };
    },
    head: async (key: string) => {
      if (!blobs.files.has(key)) throw new actual.BlobNotFoundError();
      return { pathname: key };
    },
    get: async (key: string) => {
      const bytes = blobs.files.get(key);
      if (!bytes) return null;
      return {
        statusCode: 200,
        stream: new Response(bytes as BodyInit).body,
        blob: { size: bytes.length },
      };
    },
    del: async (key: string) => void blobs.files.delete(key),
  };
});

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
  "vercel-blob": async () => {
    blobs.files.clear();
    return createVercelBlobImageStore();
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

describe("vercel-blob driver", () => {
  it("puts privately, without a random suffix and without overwrite", async () => {
    blobs.files.clear();
    blobs.puts.length = 0;
    await createVercelBlobImageStore().put("images/k.png", new Uint8Array([1]), "image/png");
    expect(blobs.puts).toEqual([
      {
        key: "images/k.png",
        options: {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "image/png",
        },
      },
    ]);
  });

  it("is selected by IMAGE_STORE_DRIVER=vercel-blob, token optional", () => {
    expect(
      parseEnv({ DATABASE_URL: "x", ADMIN_PASSWORD: "x", IMAGE_STORE_DRIVER: "vercel-blob" }),
    ).toMatchObject({ IMAGE_STORE_DRIVER: "vercel-blob" });
  });
});

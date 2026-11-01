import { strToU8, zipSync, type Zippable } from "fflate";
import { describe, expect, it } from "vitest";
import { IMPORT_MAX_ZIP_ENTRIES, IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES } from "../shared/constants";
import { checkImage, readImageSize } from "./image-check";
import { baseName, openZip, resolveImages } from "./zip-import";

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >> 8) & 255];
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

function png(w: number, h: number, pad = 0): Uint8Array {
  const head = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];
  const out = new Uint8Array(33 + pad);
  out.set([...head, ...be32(w), ...be32(h), 8, 6, 0, 0, 0, 0, 0, 0, 0]);
  return out;
}
function gif(w: number, h: number): Uint8Array {
  return Uint8Array.from([...strToU8("GIF89a"), ...le16(w), ...le16(h), 0, 0, 0, 0x3b]);
}
function jpeg(w: number, h: number): Uint8Array {
  const app0 = [0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0, 11, 8, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 1, 1, 0x11, 0];
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}
function webpX(w: number, h: number): Uint8Array {
  return Uint8Array.from([
    ...strToU8("RIFF"), 22, 0, 0, 0, ...strToU8("WEBP"), ...strToU8("VP8X"), 10, 0, 0, 0,
    0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1),
  ]);
}
function webpLossy(w: number, h: number): Uint8Array {
  return Uint8Array.from([
    ...strToU8("RIFF"), 30, 0, 0, 0, ...strToU8("WEBP"), ...strToU8("VP8 "), 18, 0, 0, 0,
    0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(w), ...le16(h), 0, 0,
  ]);
}
function webpLossless(w: number, h: number): Uint8Array {
  const bits = ((w - 1) | ((h - 1) << 14)) >>> 0;
  return Uint8Array.from([
    ...strToU8("RIFF"), 30, 0, 0, 0, ...strToU8("WEBP"), ...strToU8("VP8L"), 10, 0, 0, 0,
    0x2f, bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255, 0, 0, 0,
  ]);
}

const csv = strToU8("id,topic,front,back\n1,a,b,c\n");
const zip = (files: Zippable) => zipSync(files, { level: 0 });
const SYMLINK_ATTRS = (0o120777 << 16) >>> 0;

describe("zip safety", () => {
  it("opens a safe zip and lists files by path", () => {
    const r = openZip(zip({ "deck.csv": csv, "images/a.png": png(2, 2) }));
    expect(r.blocked).toBe(false);
    expect([...r.files.keys()].sort()).toEqual(["deck.csv", "images/a.png"]);
  });

  it.each([
    ["/etc/passwd"],
    ["\\evil.png"],
    ["C:/evil.png"],
    ["a/../../evil.png"],
    ["../evil.png"],
  ])("blocks unsafe path %s", (name) => {
    const r = openZip(zip({ "deck.csv": csv, [name]: png(2, 2) }));
    expect(r.blocked).toBe(true);
    expect(r.issues.map((i) => i.code)).toContain("unsafe_path");
    expect(r.files.size).toBe(0);
  });

  it("blocks symlink entries read from the directory attributes", () => {
    const r = openZip(zip({ "deck.csv": csv, link: [strToU8("/etc/passwd"), { attrs: SYMLINK_ATTRS, os: 3 }] }));
    expect(r.blocked).toBe(true);
    expect(r.issues.map((i) => i.code)).toContain("symlink");
  });

  it("does not treat a regular unix file as a symlink", () => {
    const r = openZip(zip({ "deck.csv": [csv, { attrs: (0o100644 << 16) >>> 0, os: 3 }] }));
    expect(r.blocked).toBe(false);
  });

  it("allows exactly the entry limit and blocks one more", () => {
    const make = (n: number) => {
      const f: Zippable = {};
      for (let i = 0; i < n; i++) f[`f${i}.txt`] = new Uint8Array(0);
      return zip(f);
    };
    expect(openZip(make(IMPORT_MAX_ZIP_ENTRIES)).blocked).toBe(false);
    const r = openZip(make(IMPORT_MAX_ZIP_ENTRIES + 1));
    expect(r.blocked).toBe(true);
    expect(r.issues[0].code).toBe("too_many_entries");
  });

  it("blocks over 200 MB uncompressed without inflating", () => {
    const big = new Uint8Array(IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES / 2 + 1);
    const r = openZip(zipSync({ "a.bin": big, "b.bin": big }, { level: 9 }));
    expect(r.blocked).toBe(true);
    expect(r.issues[0].code).toBe("too_large");
    expect(r.files.size).toBe(0);
  });

  it("blocks bytes that are not a zip", () => {
    const r = openZip(strToU8("not a zip at all, just text padding"));
    expect(r.issues[0].code).toBe("unreadable_zip");
  });
});

describe("image resolution", () => {
  const files = (entries: Record<string, Uint8Array>) => new Map(Object.entries(entries));
  const run = (names: string[], f: Record<string, Uint8Array>) => resolveImages(names, files(f));

  it("matches by base name, so q02-back.png finds images/q02-back.png", async () => {
    const r = await run(["q02-back.png"], { "images/q02-back.png": png(10, 20) });
    expect(r.issues).toEqual([]);
    expect(r.images.get("q02-back.png")!.info).toMatchObject({ width: 10, height: 20 });
    expect(baseName("a\\b/c.png")).toBe("c.png");
  });

  it("warns and drops a missing image", async () => {
    const r = await run(["nope.png"], { "images/a.png": png(2, 2) });
    expect(r.issues).toMatchObject([{ severity: "warning", code: "missing_image", image: "nope.png" }]);
    expect(r.images.size).toBe(0);
  });

  it("warns and drops two entries with the same base name", async () => {
    const r = await run(["a.png"], { "x/a.png": png(2, 2), "y/a.png": png(3, 3) });
    expect(r.issues).toMatchObject([{ severity: "warning", code: "ambiguous_image" }]);
    expect(r.images.size).toBe(0);
  });

  it("warns on a wrong type by bytes with a misleading extension", async () => {
    const r = await run(["a.png"], { "a.png": strToU8("just some text, not an image") });
    expect(r.issues).toMatchObject([{ severity: "warning", code: "image_wrong_type" }]);
    expect(r.images.size).toBe(0);
  });

  it("warns on a PDF named .png", async () => {
    const r = await run(["a.png"], { "a.png": strToU8("%PDF-1.4\n%....\n1 0 obj\n<<>>\nendobj\n") });
    expect(r.issues[0].code).toBe("image_wrong_type");
  });

  it("warns on SVG", async () => {
    const svg = strToU8('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
    const r = await run(["a.svg", "b.png"], { "a.svg": svg, "b.png": svg });
    expect(r.issues.map((i) => i.code)).toEqual(["image_svg", "image_svg"]);
    expect(r.images.size).toBe(0);
  });

  it("warns on an image over 5 MB and accepts exactly 5 MB", async () => {
    const limit = 5 * 1024 * 1024;
    expect((await checkImage(png(2, 2, limit - 33))).ok).toBe(true);
    const r = await run(["a.png"], { "a.png": png(2, 2, limit - 32) });
    expect(r.issues[0].code).toBe("image_too_large");
  });

  it("warns over 4,096 px on either side and accepts 4,096", async () => {
    expect((await checkImage(png(4096, 4096))).ok).toBe(true);
    for (const [w, h] of [[4097, 10], [10, 4097]]) {
      const r = await run(["a.png"], { "a.png": png(w, h) });
      expect(r.issues[0].code).toBe("image_too_many_pixels");
    }
  });
});

describe("image check", () => {
  it.each([
    ["png", png(321, 123), "image/png", 321, 123, "png"],
    ["gif", gif(40, 30), "image/gif", 40, 30, "gif"],
    ["jpeg", jpeg(640, 480), "image/jpeg", 640, 480, "jpg"],
    ["webp VP8X", webpX(800, 600), "image/webp", 800, 600, "webp"],
    ["webp VP8", webpLossy(500, 300), "image/webp", 500, 300, "webp"],
    ["webp VP8L", webpLossless(70, 90), "image/webp", 70, 90, "webp"],
  ] as const)("reads %s dimensions, hash and key", async (_n, bytes, mime, w, h, ext) => {
    expect(readImageSize(bytes, mime)).toEqual({ width: w, height: h });
    const r = await checkImage(bytes);
    if (!r.ok) throw new Error(r.message);
    const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
    const sha = [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
    expect(r.image).toMatchObject({ mime, width: w, height: h, sha256: sha, storageKey: `images/${sha}.${ext}` });
    expect(r.image.bytes).toBe(bytes.length);
  });

  it("returns null for a truncated header", () => {
    expect(readImageSize(new Uint8Array(5), "image/png")).toBeNull();
    expect(readImageSize(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg")).toBeNull();
  });
});

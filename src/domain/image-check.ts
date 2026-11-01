import { fileTypeFromBuffer } from "file-type";
import { IMAGE_MAX_BYTES, IMAGE_MAX_DIMENSION_PX, IMAGE_MIME_TYPES } from "../shared/constants";

export type ImageMime = (typeof IMAGE_MIME_TYPES)[number];

export type ImageRejection = "too_large" | "svg" | "wrong_type" | "too_many_pixels" | "unreadable";

export interface ImageInfo {
  mime: ImageMime;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  storageKey: string;
}

export type ImageCheck =
  | { ok: true; image: ImageInfo }
  | { ok: false; reason: ImageRejection; message: string };

const EXTENSIONS: Record<ImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface Dimensions {
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32be = (b: Uint8Array, o: number) =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function pngSize(b: Uint8Array): Dimensions | null {
  if (b.length < 24) return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

function gifSize(b: Uint8Array): Dimensions | null {
  if (b.length < 10) return null;
  return { width: u16le(b, 6), height: u16le(b, 8) };
}

function jpegSize(b: Uint8Array): Dimensions | null {
  let o = 2;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) {
      o += 1;
      continue;
    }
    const marker = b[o + 1];
    if (marker === 0xff) {
      o += 1;
      continue;
    }
    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      o += 2;
      continue;
    }
    const length = u16be(b, o + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (o + 9 > b.length) return null;
      return { height: u16be(b, o + 5), width: u16be(b, o + 7) };
    }
    o += 2 + length;
  }
  return null;
}

function webpSize(b: Uint8Array): Dimensions | null {
  if (b.length < 25) return null;
  const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (tag === "VP8 " && b.length >= 30) {
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (tag === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (tag === "VP8X" && b.length >= 30) {
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

/** Reads width and height from the file header; null when the header is unreadable. */
export function readImageSize(bytes: Uint8Array, mime: ImageMime): Dimensions | null {
  const size =
    mime === "image/png"
      ? pngSize(bytes)
      : mime === "image/gif"
        ? gifSize(bytes)
        : mime === "image/jpeg"
          ? jpegSize(bytes)
          : webpSize(bytes);
  if (!size || size.width < 1 || size.height < 1) return null;
  return size;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("");
}

export function imageStorageKey(sha256: string, mime: ImageMime): string {
  return `images/${sha256}.${EXTENSIONS[mime]}`;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).toLowerCase();
  return head.includes("<svg") || (head.includes("<?xml") && head.includes("svg"));
}

const reject = (reason: ImageRejection, message: string): ImageCheck => ({ ok: false, reason, message });

/** Checks an image by its bytes (never its extension): size, type, dimensions; computes hash and key. */
export async function checkImage(bytes: Uint8Array): Promise<ImageCheck> {
  if (bytes.length > IMAGE_MAX_BYTES) {
    return reject("too_large", `larger than ${IMAGE_MAX_BYTES / (1024 * 1024)} MB`);
  }
  const detected = await fileTypeFromBuffer(bytes);
  const mime = detected?.mime as ImageMime | undefined;
  if (!mime || !(IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    if (looksLikeSvg(bytes)) return reject("svg", "SVG images are not allowed");
    return reject("wrong_type", "not a PNG, JPEG, WebP or GIF image");
  }
  const size = readImageSize(bytes, mime);
  if (!size) return reject("unreadable", "image size could not be read");
  if (size.width > IMAGE_MAX_DIMENSION_PX || size.height > IMAGE_MAX_DIMENSION_PX) {
    return reject("too_many_pixels", `wider or taller than ${IMAGE_MAX_DIMENSION_PX} px`);
  }
  const sha256 = await sha256Hex(bytes);
  return {
    ok: true,
    image: {
      mime,
      bytes: bytes.length,
      width: size.width,
      height: size.height,
      sha256,
      storageKey: imageStorageKey(sha256, mime),
    },
  };
}

import { unzipSync } from "fflate";
import { IMPORT_MAX_ZIP_ENTRIES, IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES } from "../shared/constants";
import { checkImage, type ImageInfo, type ImageRejection } from "./image-check";

export interface ZipIssue {
  severity: "block" | "warning";
  code:
    | "unreadable_zip"
    | "unsafe_path"
    | "symlink"
    | "too_many_entries"
    | "too_large"
    | "missing_image"
    | "ambiguous_image"
    | `image_${ImageRejection}`;
  entry?: string;
  /** Image file name as written in the CSV. */
  image?: string;
  message: string;
}

export interface ZipEntryInfo {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  isDirectory: boolean;
  isSymlink: boolean;
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

/** Reads the central directory, which also carries the Unix mode that fflate does not expose. */
export function readZipDirectory(zip: Uint8Array): ZipEntryInfo[] | null {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntryInfo[] = [];
  for (let n = 0; n < count; n++) {
    if (offset + 46 > zip.length || view.getUint32(offset, true) !== CEN_SIG) return null;
    const madeBy = view.getUint16(offset + 4, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const external = view.getUint32(offset + 38, true);
    if (offset + 46 + nameLen > zip.length) return null;
    const name = decoder.decode(zip.subarray(offset + 46, offset + 46 + nameLen));
    const unixMode = madeBy >>> 8 === 3 ? external >>> 16 : 0;
    entries.push({
      name,
      compressedSize,
      uncompressedSize: size,
      isDirectory: name.endsWith("/"),
      isSymlink: (unixMode & 0xf000) === 0xa000,
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function unsafePath(name: string): boolean {
  if (name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:/.test(name)) return true;
  return name.split(/[\\/]/).some((part) => part === "..");
}

const MB = 1024 * 1024;
const TOO_LARGE: ZipIssue = {
  severity: "block",
  code: "too_large",
  message: `The zip is over ${IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES / MB} MB uncompressed`,
};

/**
 * The most bytes fflate's unzipSync can produce for an entry, from the central directory alone.
 * Measured on fflate 0.8.3: a deflated entry inflates into a buffer of its declared uncompressed
 * size and output past it is dropped, so a lying size cannot inflate further; a stored entry is
 * copied at its compressed size. The larger of the two bounds both methods.
 */
const outputBound = (e: ZipEntryInfo): number => Math.max(e.compressedSize, e.uncompressedSize);

export interface ZipContents {
  blocked: boolean;
  issues: ZipIssue[];
  /** Every file entry by its path inside the zip (directories and non-file entries skipped). */
  files: Map<string, Uint8Array>;
}

/** Validates a zip's directory and unpacks it; blocked results carry no files. */
export function openZip(zip: Uint8Array): ZipContents {
  const blocked = (issues: ZipIssue[]): ZipContents => ({
    blocked: true,
    issues,
    files: new Map(),
  });
  const entries = readZipDirectory(zip);
  if (!entries) {
    return blocked([
      { severity: "block", code: "unreadable_zip", message: "The zip file could not be read" },
    ]);
  }
  const issues: ZipIssue[] = [];
  if (entries.length > IMPORT_MAX_ZIP_ENTRIES) {
    issues.push({
      severity: "block",
      code: "too_many_entries",
      message: `The zip has more than ${IMPORT_MAX_ZIP_ENTRIES} entries`,
    });
  }
  let total = 0;
  for (const e of entries) {
    total += outputBound(e);
    if (unsafePath(e.name)) {
      issues.push({
        severity: "block",
        code: "unsafe_path",
        entry: e.name,
        message: `Unsafe path in zip: ${e.name}`,
      });
    }
    if (e.isSymlink) {
      issues.push({
        severity: "block",
        code: "symlink",
        entry: e.name,
        message: `Symlink in zip: ${e.name}`,
      });
    }
  }
  if (total > IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES) issues.push(TOO_LARGE);
  if (issues.length > 0) return blocked(issues);

  let unpacked: Record<string, Uint8Array>;
  try {
    unpacked = unzipSync(zip, { filter: (f) => !f.name.endsWith("/") });
  } catch {
    return blocked([
      { severity: "block", code: "unreadable_zip", message: "The zip file could not be read" },
    ]);
  }
  // No check after unpacking: outputBound already capped what unzipSync could produce.
  return { blocked: false, issues: [], files: new Map(Object.entries(unpacked)) };
}

export const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path;

export interface ResolvedImages {
  issues: ZipIssue[];
  /** Valid images by the name written in the CSV; names with a warning are absent (the card imports without them). */
  images: Map<string, { info: ImageInfo; bytes: Uint8Array }>;
}

/** Matches CSV image names to zip entries by base file name and checks each image once. */
export async function resolveImages(
  names: Iterable<string>,
  files: Map<string, Uint8Array>,
): Promise<ResolvedImages> {
  const byBase = new Map<string, string[]>();
  for (const path of files.keys()) {
    const key = baseName(path).toLowerCase();
    byBase.set(key, [...(byBase.get(key) ?? []), path]);
  }
  const issues: ZipIssue[] = [];
  const images: ResolvedImages["images"] = new Map();
  for (const image of new Set(names)) {
    const matches = byBase.get(baseName(image).toLowerCase()) ?? [];
    if (matches.length === 0) {
      issues.push({
        severity: "warning",
        code: "missing_image",
        image,
        message: `Image not in the zip: ${image}`,
      });
      continue;
    }
    if (matches.length > 1) {
      issues.push({
        severity: "warning",
        code: "ambiguous_image",
        image,
        message: `More than one zip entry is named ${image}: ${matches.join(", ")}`,
      });
      continue;
    }
    const bytes = files.get(matches[0])!;
    const check = await checkImage(bytes);
    if (!check.ok) {
      issues.push({
        severity: "warning",
        code: `image_${check.reason}`,
        image,
        entry: matches[0],
        message: `${image}: ${check.message}`,
      });
      continue;
    }
    images.set(image, { info: check.image, bytes });
  }
  return { issues, images };
}

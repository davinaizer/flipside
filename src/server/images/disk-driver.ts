import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { ImageNotFoundError, InvalidImageKeyError, type ImageStore } from "./store";

export function createDiskImageStore(root: string): ImageStore {
  const base = resolve(root);

  // Refuse any key that resolves outside the root (../, absolute paths, NUL).
  function pathFor(key: string): string {
    const full = resolve(base, key);
    const rel = relative(base, full);
    if (!key || key.includes("\0") || !rel || rel.startsWith("..") || isAbsolute(rel)) {
      throw new InvalidImageKeyError(key);
    }
    return full;
  }

  async function exists(key: string): Promise<boolean> {
    try {
      return (await stat(pathFor(key))).isFile();
    } catch (e) {
      if (isMissing(e)) return false;
      throw e;
    }
  }

  return {
    exists,
    async put(key, bytes) {
      const path = pathFor(key);
      // Keys are content-addressed, so an existing file already has these bytes.
      if (await exists(key)) return;
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    },
    async get(key) {
      const path = pathFor(key);
      if (!(await exists(key))) throw new ImageNotFoundError(key);
      return Readable.toWeb(createReadStream(path)) as unknown as ReadableStream<Uint8Array>;
    },
    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
  };
}

function isMissing(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException).code;
  return code === "ENOENT" || code === "ENOTDIR";
}

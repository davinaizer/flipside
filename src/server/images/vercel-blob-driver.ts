import { BlobNotFoundError, del, get, head, put } from "@vercel/blob";
import { ImageNotFoundError, InvalidImageKeyError, type ImageStore } from "./store";

/**
 * Private Vercel Blob store (H4). The token comes from BLOB_READ_WRITE_TOKEN, or from OIDC on
 * Vercel, so nothing is passed here. Bytes are only ever read back through our own route.
 */
export function createVercelBlobImageStore(): ImageStore {
  // Same key rules as the disk driver: no empty, NUL, absolute or parent-relative keys.
  function check(key: string): string {
    if (!key || key.includes("\0") || key.startsWith("/") || key.split("/").includes("..")) {
      throw new InvalidImageKeyError(key);
    }
    return key;
  }

  async function exists(key: string): Promise<boolean> {
    try {
      await head(check(key));
      return true;
    } catch (e) {
      if (e instanceof BlobNotFoundError) return false;
      throw e;
    }
  }

  return {
    exists,
    async put(key, bytes, mime) {
      check(key);
      // Keys are content-addressed, so an existing blob already has these bytes.
      if (await exists(key)) return;
      try {
        await put(key, Buffer.from(bytes), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: mime,
        });
      } catch (e) {
        // A concurrent put of the same key wins the race; same key means same bytes.
        if (await exists(key)) return;
        throw e;
      }
    },
    async get(key) {
      const result = await get(check(key), { access: "private" });
      if (!result || result.statusCode !== 200) throw new ImageNotFoundError(key);
      return result.stream;
    },
    async delete(key) {
      // del of a missing blob is not an error in the SDK, which keeps this idempotent.
      await del(check(key));
    },
  };
}

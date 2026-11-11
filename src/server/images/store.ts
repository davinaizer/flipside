import { getEnv } from "@/server/env";
import { createDiskImageStore } from "./disk-driver";
import { createVercelBlobImageStore } from "./vercel-blob-driver";

/** Where card images live. The disk driver serves local use and tests; the vercel-blob driver serves the hosted app. */
export interface ImageStore {
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
  /** Throws ImageNotFoundError when the key is missing. */
  get(key: string): Promise<ReadableStream<Uint8Array>>;
  /** Idempotent: deleting a missing key is not an error. */
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class ImageNotFoundError extends Error {
  constructor(key: string) {
    super(`Image not found: ${key}`);
    this.name = "ImageNotFoundError";
  }
}

export class InvalidImageKeyError extends Error {
  constructor(key: string) {
    super(`Invalid image key: ${key}`);
    this.name = "InvalidImageKeyError";
  }
}

let store: ImageStore | undefined;
/** The store chosen by IMAGE_STORE_DRIVER. */
export function getImageStore(): ImageStore {
  if (store) return store;
  const env = getEnv();
  switch (env.IMAGE_STORE_DRIVER) {
    case "fs":
      return (store = createDiskImageStore(env.IMAGE_STORE_PATH));
    case "vercel-blob":
      return (store = createVercelBlobImageStore());
  }
}

import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { images } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { getImageStore, ImageNotFoundError, type ImageStore } from "./store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ServedImage = {
  mime: string;
  /** Strong ETag: the content hash in quotes. */
  etag: string;
  /** Null when the client's If-None-Match already matches (answer 304). */
  stream: ReadableStream<Uint8Array> | null;
};

/** True when an If-None-Match header lists the etag (quoted, weak or bare, or "*"). */
function matches(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""))
    .some((t) => t === "*" || t === etag || t === etag.slice(1, -1));
}

/**
 * Looks up an image the profile owns. Another profile's, unknown and malformed ids are all 404.
 * The stored mime was sniffed from the bytes at import time.
 */
export async function getImage(
  profileId: string,
  imageId: string,
  ifNoneMatch: string | null,
  db: Db = getDb(),
  store: ImageStore = getImageStore(),
): Promise<ServedImage> {
  const notFound = () => new ApiError(404, "image_not_found", "That image does not exist.");
  if (!UUID.test(imageId)) throw notFound();
  const [row] = await db
    .select({ sha256: images.sha256, mime: images.mime, storageKey: images.storageKey })
    .from(images)
    .where(and(eq(images.id, imageId.toLowerCase()), eq(images.ownerProfileId, profileId)));
  if (!row) throw notFound();
  const etag = `"${row.sha256}"`;
  if (matches(ifNoneMatch, etag)) return { mime: row.mime, etag, stream: null };
  try {
    return { mime: row.mime, etag, stream: await store.get(row.storageKey) };
  } catch (e) {
    if (e instanceof ImageNotFoundError) throw notFound();
    throw e;
  }
}

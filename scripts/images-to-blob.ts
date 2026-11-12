// Usage: pnpm images:to-blob [--dry-run]
// Uploads every image the database refers to from the local disk store to the hosted Vercel Blob
// store, under the same storage key. Use it when copying the local database to the hosted one
// (docs/operations.md, "Copy local data to the hosted app"), so the copied rows find their images.
// Needs DATABASE_URL (the database whose image rows are copied, normally the local one),
// BLOB_READ_WRITE_TOKEN (the hosted Blob store) and, if images are not in ./data/images,
// IMAGE_STORE_PATH. Keys are content-addressed, so a key already in Blob is skipped and a rerun is safe.
import { parseArgs } from "node:util";
import { getDb } from "@/server/db/client";
import { images } from "@/server/db/schema";
import { createDiskImageStore } from "@/server/images/disk-driver";
import { createVercelBlobImageStore } from "@/server/images/vercel-blob-driver";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
const dryRun = values["dry-run"];

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("images:to-blob: set BLOB_READ_WRITE_TOKEN to the hosted Blob store's token.");
  process.exit(2);
}

try {
  const disk = createDiskImageStore(process.env.IMAGE_STORE_PATH ?? "./data/images");
  const blob = createVercelBlobImageStore();
  const rows = await getDb()
    .selectDistinct({ key: images.storageKey, mime: images.mime })
    .from(images);

  let uploaded = 0;
  let present = 0;
  const missingLocally: string[] = [];
  for (const { key, mime } of rows) {
    if (await blob.exists(key)) {
      present++;
      continue;
    }
    if (!(await disk.exists(key))) {
      missingLocally.push(key);
      continue;
    }
    if (!dryRun) {
      const bytes = new Uint8Array(await new Response(await disk.get(key)).arrayBuffer());
      await blob.put(key, bytes, mime);
    }
    uploaded++;
    console.log(`${dryRun ? "would upload" : "uploaded"} ${key}`);
  }

  console.log(
    `images:to-blob: ${rows.length} images, ${present} already in Blob, ` +
      `${uploaded} ${dryRun ? "to upload" : "uploaded"}, ${missingLocally.length} missing locally.`,
  );
  for (const key of missingLocally) console.error(`missing locally: ${key}`);
  process.exit(missingLocally.length > 0 ? 1 : 0);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}

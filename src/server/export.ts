import { and, asc, eq, isNull } from "drizzle-orm";
import { zipSync, strToU8 } from "fflate";
import Papa from "papaparse";
import { CSV_COLUMNS } from "@/domain/csv-import";
import { EXTENSIONS, type ImageMime } from "@/domain/image-check";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cards, images } from "@/server/db/schema";
import { getDeck } from "@/server/decks";
import { getImageStore, type ImageStore } from "@/server/images/store";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Zip of deck.csv plus images/ for a deck the profile owns (404 otherwise, via getDeck).
 * Images are named by content hash, so one picture used twice is stored once and the
 * names re-import cleanly (the importer matches by base file name).
 */
export async function exportDeck(
  profileId: string,
  deckId: string,
  db: Db = getDb(),
  store: ImageStore = getImageStore(),
): Promise<{ filename: string; bytes: Uint8Array }> {
  const { deck } = await getDeck(profileId, deckId, db);
  const rows = await db
    .select({
      externalId: cards.externalId,
      topic: cards.topic,
      front: cards.front,
      back: cards.back,
      frontImageId: cards.frontImageId,
      backImageId: cards.backImageId,
    })
    .from(cards)
    .where(and(eq(cards.deckId, deck.id), isNull(cards.deletedAt)))
    .orderBy(asc(cards.position));
  const imageRows = await db
    .select({ id: images.id, sha256: images.sha256, mime: images.mime, storageKey: images.storageKey })
    .from(images)
    .where(eq(images.ownerProfileId, profileId));
  const byId = new Map(imageRows.map((i) => [i.id, i]));

  const files: Record<string, Uint8Array> = {};
  const nameOf = async (imageId: string | null): Promise<string> => {
    const image = imageId ? byId.get(imageId) : undefined;
    if (!image) return "";
    const name = `${image.sha256}.${EXTENSIONS[image.mime as ImageMime] ?? "bin"}`;
    if (!files[`images/${name}`]) files[`images/${name}`] = await readAll(await store.get(image.storageKey));
    return name;
  };

  const data: string[][] = [];
  for (const c of rows) {
    data.push([c.externalId, c.topic, c.front, c.back, await nameOf(c.frontImageId), await nameOf(c.backImageId)]);
  }
  const csv = Papa.unparse({ fields: [...CSV_COLUMNS], data }, { newline: "\r\n" });
  files["deck.csv"] = strToU8(csv);
  const safe = deck.name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "deck";
  return { filename: `${safe}.zip`, bytes: zipSync(files) };
}

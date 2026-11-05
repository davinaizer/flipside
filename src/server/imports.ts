import { buildPreview, parseImportFile } from "@/domain/import-file";
import { ApiError } from "@/server/http/errors";
import { getDb, type Db } from "@/server/db/client";
import { cards, decks, images as imagesTable, importRuns } from "@/server/db/schema";
import { getImageStore } from "@/server/images/store";
import {
  importDeckDetailsSchema,
  type ImportIssue,
  type ImportPreview,
  type ImportResult,
} from "@/shared/schemas/import";
import { and, eq, isNull } from "drizzle-orm";
import { isUuid } from "@/shared/uuid";

const blocked = (issues: ImportIssue[]) =>
  new ApiError(
    422,
    "import_blocked",
    "This file cannot be imported. " + issues[0].message + ".",
    issues,
  );

/** Shared parse (domain) turned into the API's 422 when the file cannot be imported at all. */
async function parseImport(bytes: Uint8Array) {
  const parsed = await parseImportFile(bytes);
  if (!parsed.ok) throw blocked(parsed.issues);
  return parsed;
}

/**
 * Dry run (PRD section 6, steps 1-2): parses and validates a CSV or zip and reports what an
 * import would do. Saves nothing and touches neither the database nor the image store.
 * Files that cannot be imported at all throw a 422 `import_blocked` with the issues as details.
 */
export async function previewImport(bytes: Uint8Array): Promise<ImportPreview> {
  return buildPreview(await parseImport(bytes));
}

/**
 * Commit (PRD section 6, step 4): revalidates the file, then saves the deck, images, cards and import
 * run in one transaction. Image files are written inside it, so a failed write rolls the rows back; a
 * file already written stays on disk, which is harmless because keys are content-addressed and
 * unreferenced files wait for the cleanup script (PRD section 12).
 *
 * A `deckId` field makes it a re-import (I4) into that deck: cards are matched by id, matched cards
 * get their topic, front, back and images updated, new ids are added, and ids missing from the file
 * are kept and listed. Progress (card_state, review_log) is keyed by card row id and never touched.
 */
export async function commitImport(
  profileId: string,
  upload: Upload,
  db: Db = getDb(),
): Promise<ImportResult> {
  const deckId = typeof upload.details.deckId === "string" ? upload.details.deckId.trim() : "";
  let details: ReturnType<typeof importDeckDetailsSchema.parse> | null = null;
  if (deckId) {
    await ownedDeck(db, profileId, deckId);
  } else {
    const parsed = importDeckDetailsSchema.safeParse(upload.details);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_request",
        "Check the deck details.",
        parsed.error.issues.map((i) => ({ ...i })),
      );
    }
    details = parsed.data;
  }
  const { csv, issues, images } = await parseImport(upload.bytes);
  if (csv.cards.length === 0)
    throw blocked([
      { severity: "block", code: "no_cards", message: "The file has no valid cards" },
    ]);
  const store = getImageStore();

  return db.transaction(async (tx) => {
    let targetId: string;
    if (details) {
      [{ id: targetId }] = await tx
        .insert(decks)
        .values({
          ownerProfileId: profileId,
          name: details.name,
          groupName: details.group ?? null,
          color: details.color,
          answerStyle: details.answerStyle,
        })
        .returning({ id: decks.id });
    } else {
      // Re-checked inside the transaction so a deck deleted meanwhile is still a 404.
      targetId = await ownedDeck(tx, profileId, deckId);
    }

    // One image row per (owner, hash): reuse this profile's row, never another profile's.
    const imageIds = new Map<string, string>();
    for (const { info, bytes } of new Set(images.values())) {
      if (imageIds.has(info.sha256)) continue;
      const [existing] = await tx
        .select({ id: imagesTable.id })
        .from(imagesTable)
        .where(and(eq(imagesTable.ownerProfileId, profileId), eq(imagesTable.sha256, info.sha256)));
      let id = existing?.id;
      if (!id) {
        [{ id }] = await tx
          .insert(imagesTable)
          .values({
            ownerProfileId: profileId,
            sha256: info.sha256,
            mime: info.mime,
            bytes: info.bytes,
            width: info.width,
            height: info.height,
            storageKey: info.storageKey,
          })
          .returning({ id: imagesTable.id });
      }
      await store.put(info.storageKey, bytes, info.mime);
      imageIds.set(info.sha256, id);
    }
    /**
     * Image id for a cell: null when empty, the stored row when the file supplied it. A name the file
     * could not supply (CSV without zip, missing or rejected picture) keeps the card's current image,
     * so re-importing only the CSV does not strip pictures.
     */
    const imageId = (name: string | null, current: string | null) => {
      if (!name) return null;
      const found = images.get(name);
      return found ? imageIds.get(found.info.sha256)! : current;
    };

    const existing = await tx.select().from(cards).where(eq(cards.deckId, targetId));
    const byExternalId = new Map(existing.map((c) => [c.externalId, c]));
    let nextPosition = existing.reduce((max, c) => Math.max(max, c.position + 1), 0);
    const toInsert: (typeof cards.$inferInsert)[] = [];
    let updated = 0;
    let unchanged = 0;
    for (const c of csv.cards) {
      const match = byExternalId.get(c.id);
      if (!match) {
        toInsert.push({
          deckId: targetId,
          externalId: c.id,
          topic: c.topic,
          front: c.front,
          back: c.back,
          frontImageId: imageId(c.frontImage, null),
          backImageId: imageId(c.backImage, null),
          position: nextPosition++,
        });
        continue;
      }
      const next = {
        topic: c.topic,
        front: c.front,
        back: c.back,
        frontImageId: imageId(c.frontImage, match.frontImageId),
        backImageId: imageId(c.backImage, match.backImageId),
      };
      const same = (Object.keys(next) as (keyof typeof next)[]).every((k) => next[k] === match[k]);
      if (same) {
        unchanged++;
      } else {
        await tx
          .update(cards)
          .set({ ...next, updatedAt: new Date() })
          .where(eq(cards.id, match.id));
        updated++;
      }
    }
    if (toInsert.length > 0) await tx.insert(cards).values(toInsert);

    const inFile = new Set(csv.cards.map((c) => c.id));
    const missing = existing
      .filter((c) => c.deletedAt === null && !inFile.has(c.externalId))
      .sort((x, y) => x.position - y.position)
      .map((c) => c.externalId);
    // Listed as warnings so import_runs records them without a schema change.
    const warnings: ImportIssue[] = [
      ...issues.filter((i) => i.severity === "warning"),
      ...missing.map((id) => ({
        severity: "warning" as const,
        code: "card_not_in_file",
        message: `Card ${id} is in the deck but not in the file; it was kept`,
      })),
    ];
    const skipped = csv.rowCount - csv.cards.length;
    await tx.insert(importRuns).values({
      profileId,
      deckId: targetId,
      filename: upload.filename,
      rowsTotal: csv.rowCount,
      rowsAdded: toInsert.length,
      rowsUpdated: updated,
      rowsSkipped: skipped,
      warnings,
    });
    return {
      deckId: targetId,
      added: toInsert.length,
      updated,
      unchanged,
      skipped,
      missing,
      imageCount: imageIds.size,
      warnings,
    };
  });
}

/** The profile's non-deleted deck id; another profile's, deleted, unknown or malformed ids are 404. */
async function ownedDeck(
  db: Pick<Db, "select">,
  profileId: string,
  deckId: string,
): Promise<string> {
  const notFound = new ApiError(404, "deck_not_found", "That deck does not exist.");
  if (!isUuid(deckId)) throw notFound;
  const [deck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(
      and(
        eq(decks.id, deckId.toLowerCase()),
        eq(decks.ownerProfileId, profileId),
        isNull(decks.deletedAt),
      ),
    );
  if (!deck) throw notFound;
  return deck.id;
}

export interface Upload {
  bytes: Uint8Array;
  filename: string;
  /** Text fields sent beside the file (deck name, group, colour, answer style). */
  details: Record<string, unknown>;
}

/** Reads the uploaded `file` field and the text fields from multipart form data. */
export async function readUpload(request: Request): Promise<Upload> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "invalid_request", "Send the file as multipart/form-data.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "invalid_request", "Choose a CSV or zip file to import.");
  }
  const details: Record<string, unknown> = {};
  for (const [k, v] of form) if (typeof v === "string") details[k] = v;
  return { bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name, details };
}

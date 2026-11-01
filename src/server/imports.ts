import { parseCsv, type CsvIssue } from "@/domain/csv-import";
import { openZip, resolveImages, type ResolvedImages, type ZipIssue } from "@/domain/zip-import";
import { ApiError } from "@/server/http/errors";
import { getDb, type Db } from "@/server/db/client";
import { cards, decks, images as imagesTable, importRuns } from "@/server/db/schema";
import { getImageStore } from "@/server/images/store";
import { importDeckDetailsSchema, type ImportIssue, type ImportPreview, type ImportResult } from "@/shared/schemas/import";
import { and, eq } from "drizzle-orm";

const PREVIEW_CARDS = 3;

const isZip = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b;

const blocked = (issues: ImportIssue[]) =>
  new ApiError(422, "import_blocked", "This file cannot be imported. " + issues[0].message + ".", issues);

/** A CSV inside a zip: any .csv entry, ignoring macOS resource-fork folders. */
function findCsv(files: Map<string, Uint8Array>): { name: string; bytes: Uint8Array } | ImportIssue {
  const csvs = [...files].filter(([n]) => /\.csv$/i.test(n) && !n.startsWith("__MACOSX/"));
  if (csvs.length === 1) return { name: csvs[0][0], bytes: csvs[0][1] };
  return {
    severity: "block",
    code: csvs.length === 0 ? "no_csv" : "several_csv",
    message: csvs.length === 0 ? "The zip has no CSV file" : "The zip has more than one CSV file",
  };
}

const fromCsv = (i: CsvIssue): ImportIssue => ({ ...i });
const fromZip = (i: ZipIssue): ImportIssue => ({ ...i });

type Parsed = {
  kind: "csv" | "zip";
  csv: ReturnType<typeof parseCsv>;
  issues: ImportIssue[];
  images: ResolvedImages["images"];
};

/** Steps shared by the dry run and the commit, so the server revalidates exactly what the preview showed. */
async function parseImport(bytes: Uint8Array): Promise<Parsed> {
  const kind = isZip(bytes) ? "zip" : "csv";
  const issues: ImportIssue[] = [];
  let csvBytes = bytes;
  let files = new Map<string, Uint8Array>();

  if (kind === "zip") {
    const zip = openZip(bytes);
    if (zip.blocked) throw blocked(zip.issues.map(fromZip));
    files = zip.files;
    const found = findCsv(files);
    if (!("bytes" in found)) throw blocked([found]);
    csvBytes = found.bytes;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(csvBytes);
  } catch {
    throw blocked([{ severity: "block", code: "not_utf8", message: "The CSV is not UTF-8 text" }]);
  }
  const csv = parseCsv(text);
  issues.push(...csv.issues.map(fromCsv));
  if (csv.blocked) throw blocked(issues.filter((i) => i.severity === "block"));

  let images: Parsed["images"] = new Map();
  if (kind === "zip") {
    const names = csv.cards.flatMap((c) => [c.frontImage, c.backImage]).filter((n): n is string => !!n);
    const resolved = await resolveImages(names, files);
    issues.push(...resolved.issues.map(fromZip));
    images = resolved.images;
  }
  return { kind, csv, issues, images };
}

/**
 * Dry run (PRD section 6, steps 1-2): parses and validates a CSV or zip and reports what an
 * import would do. Saves nothing and touches neither the database nor the image store.
 * Files that cannot be imported at all throw a 422 `import_blocked` with the issues as details.
 */
export async function previewImport(bytes: Uint8Array): Promise<ImportPreview> {
  const { kind, csv, issues, images } = await parseImport(bytes);
  const imageCount = new Set([...images.values()].map((i) => i.info.sha256)).size;

  return {
    kind,
    columns: csv.columns,
    unknownColumns: csv.unknownColumns,
    rowCount: csv.rowCount,
    validCount: csv.cards.length,
    skippedCount: csv.rowCount - csv.cards.length,
    imageCount,
    firstCards: csv.cards.slice(0, PREVIEW_CARDS).map(({ row, id, idDerived, topic, front, back, frontImage, backImage }) => ({
      row, id, idDerived, topic, front, back, frontImage, backImage,
    })),
    warnings: issues.filter((i) => i.severity === "warning"),
    errors: issues.filter((i) => i.severity !== "warning"),
  };
}

/**
 * Commit (PRD section 6, step 4) for a new deck: revalidates the file, then saves the deck, images,
 * cards and import run in one transaction. Image files are written inside it, so a failed write rolls
 * the rows back; a file already written stays on disk, which is harmless because keys are
 * content-addressed and unreferenced files wait for the cleanup script (PRD section 12).
 */
export async function commitImport(
  profileId: string,
  upload: Upload,
  db: Db = getDb(),
): Promise<ImportResult> {
  const parsed = importDeckDetailsSchema.safeParse(upload.details);
  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Check the deck details.", parsed.error.issues.map((i) => ({ ...i })));
  }
  const details = parsed.data;
  const { csv, issues, images } = await parseImport(upload.bytes);
  if (csv.cards.length === 0) throw blocked([{ severity: "block", code: "no_cards", message: "The file has no valid cards" }]);
  const store = getImageStore();

  return db.transaction(async (tx) => {
    const [deck] = await tx
      .insert(decks)
      .values({
        ownerProfileId: profileId,
        name: details.name,
        groupName: details.group ?? null,
        color: details.color,
        answerStyle: details.answerStyle,
      })
      .returning({ id: decks.id });

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
    const imageId = (name: string | null) => {
      const found = name ? images.get(name) : undefined;
      return found ? imageIds.get(found.info.sha256)! : null;
    };

    await tx.insert(cards).values(
      csv.cards.map((c, position) => ({
        deckId: deck.id,
        externalId: c.id,
        topic: c.topic,
        front: c.front,
        back: c.back,
        frontImageId: imageId(c.frontImage),
        backImageId: imageId(c.backImage),
        position,
      })),
    );

    const warnings = issues.filter((i) => i.severity === "warning");
    const skipped = csv.rowCount - csv.cards.length;
    await tx.insert(importRuns).values({
      profileId,
      deckId: deck.id,
      filename: upload.filename,
      rowsTotal: csv.rowCount,
      rowsAdded: csv.cards.length,
      rowsUpdated: 0,
      rowsSkipped: skipped,
      warnings,
    });
    return { deckId: deck.id, added: csv.cards.length, updated: 0, skipped, imageCount: imageIds.size, warnings };
  });
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

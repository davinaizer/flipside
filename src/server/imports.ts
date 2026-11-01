import { parseCsv, type CsvIssue } from "@/domain/csv-import";
import { openZip, resolveImages, type ZipIssue } from "@/domain/zip-import";
import { ApiError } from "@/server/http/errors";
import type { ImportIssue, ImportPreview } from "@/shared/schemas/import";

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

/**
 * Dry run (PRD section 6, steps 1-2): parses and validates a CSV or zip and reports what an
 * import would do. Saves nothing and touches neither the database nor the image store.
 * Files that cannot be imported at all throw a 422 `import_blocked` with the issues as details.
 */
export async function previewImport(bytes: Uint8Array): Promise<ImportPreview> {
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

  let imageCount = 0;
  if (kind === "zip") {
    const names = csv.cards.flatMap((c) => [c.frontImage, c.backImage]).filter((n): n is string => !!n);
    const resolved = await resolveImages(names, files);
    issues.push(...resolved.issues.map(fromZip));
    imageCount = new Set([...resolved.images.values()].map((i) => i.info.sha256)).size;
  }

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

/** Reads the uploaded `file` field from multipart form data. */
export async function readUpload(request: Request): Promise<Uint8Array> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "invalid_request", "Send the file as multipart/form-data.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError(400, "invalid_request", "Choose a CSV or zip file to import.");
  }
  return new Uint8Array(await file.arrayBuffer());
}

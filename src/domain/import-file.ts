import type { ImportIssue, ImportPreview } from "../shared/schemas/import";
import { parseCsv, type CsvIssue } from "./csv-import";
import { openZip, resolveImages, type ResolvedImages, type ZipIssue } from "./zip-import";

const PREVIEW_CARDS = 3;

const isZip = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b;

const blockedBy = (issues: ImportIssue[]) => ({ ok: false as const, issues });

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

export type ParsedImport =
  | { ok: false; issues: ImportIssue[] }
  | {
      ok: true;
      kind: "csv" | "zip";
      csv: ReturnType<typeof parseCsv>;
      issues: ImportIssue[];
      images: ResolvedImages["images"];
    };

/**
 * Pure steps of the import (PRD section 6, steps 1-2) shared by the server (dry run and commit, so
 * the commit revalidates exactly what the preview showed) and the browser preview. Files that
 * cannot be imported at all come back as `ok: false` with the blocking issues.
 */
export async function parseImportFile(bytes: Uint8Array): Promise<ParsedImport> {
  const kind = isZip(bytes) ? "zip" : "csv";
  const issues: ImportIssue[] = [];
  let csvBytes = bytes;
  let files = new Map<string, Uint8Array>();

  if (kind === "zip") {
    const zip = openZip(bytes);
    if (zip.blocked) return blockedBy(zip.issues.map(fromZip));
    files = zip.files;
    const found = findCsv(files);
    if (!("bytes" in found)) return blockedBy([found]);
    csvBytes = found.bytes;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(csvBytes);
  } catch {
    return blockedBy([{ severity: "block", code: "not_utf8", message: "The CSV is not UTF-8 text" }]);
  }
  const csv = parseCsv(text);
  issues.push(...csv.issues.map(fromCsv));
  if (csv.blocked) return blockedBy(issues.filter((i) => i.severity === "block"));

  let images: ResolvedImages["images"] = new Map();
  if (kind === "zip") {
    const names = csv.cards.flatMap((c) => [c.frontImage, c.backImage]).filter((n): n is string => !!n);
    const resolved = await resolveImages(names, files);
    issues.push(...resolved.issues.map(fromZip));
    images = resolved.images;
  }
  return { ok: true, kind, csv, issues, images };
}

/** What an import would do, for the dry run: counts, the first three cards, warnings and errors. */
export function buildPreview(parsed: Extract<ParsedImport, { ok: true }>): ImportPreview {
  const { kind, csv, issues, images } = parsed;
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

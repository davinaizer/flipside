import Papa from "papaparse";
import { IMPORT_MAX_ROWS } from "../shared/constants";
import type { AnswerStyle } from "../shared/enums";

/** Columns the importer understands (PRD section 6). */
export const CSV_COLUMNS = ["id", "topic", "front", "back", "front_image", "back_image"] as const;
export const REQUIRED_COLUMNS = ["topic", "front", "back"] as const;

export type CsvIssueSeverity = "block" | "error" | "warning";

export type CsvIssueCode =
  | "empty_file"
  | "missing_column"
  | "too_many_rows"
  | "unreadable"
  | "empty_field"
  | "duplicate_id"
  | "unknown_column"
  | "missing_id_column"
  | "missing_id";

export interface CsvIssue {
  severity: CsvIssueSeverity;
  code: CsvIssueCode;
  /** 1-based record number counting the header as row 1; absent for file-level issues. */
  row?: number;
  column?: string;
  message: string;
}

export interface CsvCard {
  id: string;
  /** True when the id was derived from topic and front because the file gave none. */
  idDerived: boolean;
  topic: string;
  front: string;
  back: string;
  frontImage: string | null;
  backImage: string | null;
  row: number;
}

export interface CsvParseResult {
  /** Known columns found in the header, in file order. */
  columns: string[];
  unknownColumns: string[];
  cards: CsvCard[];
  issues: CsvIssue[];
  /** Data rows read from the file (excluding the header). */
  rowCount: number;
  /** True when any issue blocks the import. */
  blocked: boolean;
}

/** FNV-1a 32-bit over UTF-16 code units, twice with different seeds, for a stable 16 hex digit id. */
function hash(text: string): string {
  const run = (seed: number) => {
    let h = seed;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  return run(0x811c9dc5) + run(0x9e3779b1);
}

/** Stable id from topic and front: the same text always gives the same id. */
export function deriveCardId(topic: string, front: string): string {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return `auto-${hash(`${norm(topic)}\u0000${norm(front)}`)}`;
}

/**
 * Parse and validate CSV text. Pure and browser-safe; the server runs the same
 * function again on commit.
 */
export function parseCsv(input: string): CsvParseResult {
  const issues: CsvIssue[] = [];
  const result: CsvParseResult = {
    columns: [],
    unknownColumns: [],
    cards: [],
    issues,
    rowCount: 0,
    blocked: false,
  };
  const finish = () => {
    result.blocked = issues.some((i) => i.severity === "block");
    return result;
  };

  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: "greedy" });
  const records = parsed.data;
  const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (records.length === 0) {
    issues.push({ severity: "block", code: "empty_file", message: "The file is empty." });
    return finish();
  }
  if (fatal && fatal.type === "Quotes") {
    issues.push({
      severity: "block",
      code: "unreadable",
      row: typeof fatal.row === "number" ? fatal.row + 2 : undefined,
      message: `The file could not be read: ${fatal.message}`,
    });
    return finish();
  }

  const header = records[0].map((h) => h.trim().toLowerCase());
  const known = new Set<string>(CSV_COLUMNS);
  const index = new Map<string, number>();
  header.forEach((name, i) => {
    if (name === "") return;
    if (!known.has(name)) {
      result.unknownColumns.push(name);
      issues.push({
        severity: "warning",
        code: "unknown_column",
        column: name,
        message: `Unknown column "${name}" is ignored.`,
      });
    } else if (!index.has(name)) {
      index.set(name, i);
      result.columns.push(name);
    }
  });

  for (const name of REQUIRED_COLUMNS) {
    if (!index.has(name))
      issues.push({
        severity: "block",
        code: "missing_column",
        column: name,
        message: `Required column "${name}" is missing.`,
      });
  }
  const dataRows = records.slice(1);
  result.rowCount = dataRows.length;
  if (dataRows.length > IMPORT_MAX_ROWS)
    issues.push({
      severity: "block",
      code: "too_many_rows",
      message: `The file has ${dataRows.length} rows; the limit is ${IMPORT_MAX_ROWS}.`,
    });
  if (issues.some((i) => i.severity === "block")) return finish();

  const hasIdColumn = index.has("id");
  if (!hasIdColumn)
    issues.push({
      severity: "warning",
      code: "missing_id_column",
      column: "id",
      message:
        "There is no id column, so ids are derived from topic and front. Editing a front will create a new card.",
    });

  const cell = (rec: string[], name: string) => {
    const i = index.get(name);
    return i === undefined ? "" : (rec[i] ?? "").trim();
  };
  const seen = new Set<string>();

  dataRows.forEach((rec, n) => {
    const row = n + 2;
    const topic = cell(rec, "topic");
    const front = cell(rec, "front");
    const back = cell(rec, "back");
    const empties = REQUIRED_COLUMNS.filter((c) => cell(rec, c) === "");
    if (empties.length > 0) {
      for (const column of empties)
        issues.push({
          severity: "error",
          code: "empty_field",
          row,
          column,
          message: `Row ${row}: "${column}" is empty, so the row is skipped.`,
        });
      return;
    }
    let id = cell(rec, "id");
    let idDerived = false;
    if (id === "") {
      id = deriveCardId(topic, front);
      idDerived = true;
      if (hasIdColumn)
        issues.push({
          severity: "warning",
          code: "missing_id",
          row,
          column: "id",
          message: `Row ${row}: no id, so one was derived from topic and front. Editing the front will create a new card.`,
        });
    }
    if (seen.has(id)) {
      issues.push({
        severity: "error",
        code: "duplicate_id",
        row,
        column: "id",
        message: `Row ${row}: id "${id}" already appears earlier in the file, so the row is skipped.`,
      });
      return;
    }
    seen.add(id);
    result.cards.push({
      id,
      idDerived,
      topic,
      front,
      back,
      frontImage: cell(rec, "front_image") || null,
      backImage: cell(rec, "back_image") || null,
      row,
    });
  });
  return finish();
}

/**
 * The points of an answer as a list, only for the bullets style and when the
 * cell has two or more non-empty lines; otherwise null (show a paragraph).
 */
export function bulletLines(back: string, style: AnswerStyle): string[] | null {
  if (style !== "bullets") return null;
  const lines = back
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
  return lines.length >= 2 ? lines : null;
}

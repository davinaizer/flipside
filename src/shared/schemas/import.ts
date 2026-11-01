import { z } from "zod";

/** One problem found while checking an import file; `row` counts the CSV header as row 1. */
export const importIssueSchema = z.object({
  severity: z.enum(["block", "error", "warning"]),
  code: z.string(),
  row: z.number().int().optional(),
  column: z.string().optional(),
  image: z.string().optional(),
  entry: z.string().optional(),
  message: z.string(),
});

export const importPreviewCardSchema = z.object({
  row: z.number().int(),
  id: z.string(),
  idDerived: z.boolean(),
  topic: z.string(),
  front: z.string(),
  back: z.string(),
  frontImage: z.string().nullable(),
  backImage: z.string().nullable(),
});

/** Result of POST /imports?dryRun=true for a file that can be imported (possibly with skipped rows). */
export const importPreviewSchema = z.object({
  kind: z.enum(["csv", "zip"]),
  columns: z.array(z.string()),
  unknownColumns: z.array(z.string()),
  rowCount: z.number().int(),
  /** Rows that would import: unique, complete rows. */
  validCount: z.number().int(),
  /** Rows skipped because of a row error. */
  skippedCount: z.number().int(),
  /** Distinct images in the zip that passed the checks. */
  imageCount: z.number().int(),
  firstCards: z.array(importPreviewCardSchema).max(3),
  warnings: z.array(importIssueSchema),
  errors: z.array(importIssueSchema),
});

export type ImportIssue = z.infer<typeof importIssueSchema>;
export type ImportPreview = z.infer<typeof importPreviewSchema>;

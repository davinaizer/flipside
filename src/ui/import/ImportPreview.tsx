import type { ImportIssue, ImportPreview as Preview } from "@/shared/schemas/import";

function IssueList({ title, issues }: { title: string; issues: ImportIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h3 className="font-semibold">{title}</h3>
      <ul className="flex flex-col gap-1 text-on-surface-variant">
        {issues.map((i, n) => (
          <li key={n}>
            {i.row ? `Row ${i.row}: ` : ""}
            {i.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** I2: detected columns, counts, the first three cards, then warnings and errors with row numbers. Nothing is sent yet. */
export function ImportPreview({ preview, fileName }: { preview: Preview; fileName: string }) {
  const counts = [
    `${preview.validCount} ${preview.validCount === 1 ? "card" : "cards"} ready`,
    `${preview.rowCount} ${preview.rowCount === 1 ? "row" : "rows"} read`,
    ...(preview.skippedCount > 0 ? [`${preview.skippedCount} skipped`] : []),
    ...(preview.kind === "zip" ? [`${preview.imageCount} ${preview.imageCount === 1 ? "image" : "images"}`] : []),
  ];
  return (
    <section aria-label="Preview" className="flex flex-col gap-4 rounded-2xl bg-surface-container p-6">
      <h2 className="text-2xl font-semibold">Preview of {fileName}</h2>
      <p>{counts.join(", ")}</p>
      <p className="text-on-surface-variant">
        Columns found: {preview.columns.join(", ") || "none"}
        {preview.unknownColumns.length > 0 && `. Ignored: ${preview.unknownColumns.join(", ")}`}
      </p>
      <ol aria-label="First cards" className="flex flex-col gap-3">
        {preview.firstCards.map((c) => (
          <li key={c.row} className="rounded-xl bg-surface-container-low p-4">
            <p className="text-sm text-on-surface-variant">{c.topic}</p>
            <p className="font-semibold">{c.front}</p>
            <p>{c.back}</p>
          </li>
        ))}
      </ol>
      <IssueList title="Errors" issues={preview.errors} />
      <IssueList title="Warnings" issues={preview.warnings} />
    </section>
  );
}

/** A file that cannot be imported at all: says why, offers another file. */
export function ImportBlocked({ issues }: { issues: ImportIssue[] }) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-surface-container p-6">
      <h2 className="text-2xl font-semibold">This file cannot be imported</h2>
      <IssueList title="What to fix" issues={issues} />
      <p className="text-on-surface-variant">Fix the file and choose it again. Nothing was saved.</p>
    </div>
  );
}

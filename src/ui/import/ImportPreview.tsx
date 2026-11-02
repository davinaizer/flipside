import type { ImportIssue, ImportPreview as Preview } from "@/shared/schemas/import";

/** Numbered step heading shared by the three import steps (reference layout). */
export function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">{n}</span>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <p className="text-sm text-on-surface-variant">{hint}</p>}
      </div>
    </div>
  );
}

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
      <StepHeading n={2} title="Check the cards" hint={`Preview of ${fileName}`} />
      <p>{counts.join(", ")}</p>
      <p className="text-on-surface-variant">
        Columns found: {preview.columns.join(", ") || "none"}
        {preview.unknownColumns.length > 0 && `. Ignored: ${preview.unknownColumns.join(", ")}`}
      </p>
      <table className="w-full table-fixed text-left">
        <caption className="pb-2 text-left text-sm text-on-surface-variant">
          First {preview.firstCards.length} of {preview.validCount} ready {preview.validCount === 1 ? "card" : "cards"}
        </caption>
        <thead>
          <tr className="text-sm text-on-surface-variant">
            <th scope="col" className="w-1/4 p-2 font-medium">Topic</th>
            <th scope="col" className="w-1/3 p-2 font-medium">Front</th>
            <th scope="col" className="p-2 font-medium">Back</th>
          </tr>
        </thead>
        <tbody>
          {preview.firstCards.map((c) => (
            <tr key={c.row} className="align-top odd:bg-surface-container-low">
              <td className="p-2 text-on-surface-variant">{c.topic}</td>
              <td className="p-2 font-semibold">{c.front}</td>
              <td className="p-2">{c.back}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

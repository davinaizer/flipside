import Link from "next/link";
import { Icon } from "@/ui/icons/Icon";
import type { ImportResult } from "@/shared/schemas/import";
import { buttonClass } from "@/ui/button/button-class";

/** README item 15: deck name, added, updated and unchanged counts, missing ids kept, commit warnings, and the two actions. */
export function ImportSuccess({ deckName, result }: { deckName: string; result: ImportResult }) {
  // Missing ids already have their own list; the API also returns them as warnings for import_runs.
  const warnings = result.warnings.filter((w) => w.code !== "card_not_in_file");
  return (
    <div role="status" className="flex max-w-lg flex-col gap-4 rounded-card border border-card-edge bg-surface-card p-8 shadow-card">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
        <Icon name="check" size={28} />
      </span>
      <h2 className="text-headline-lg font-semibold">Saved to {deckName}</h2>
      <p className="text-lg">
        {result.added} {result.added === 1 ? "card" : "cards"} added, {result.updated} updated, {result.unchanged} unchanged.
      </p>
      {result.missing.length > 0 && (
        <section>
          <h3 className="font-semibold">Kept, not in the file ({result.missing.length})</h3>
          <p>These cards stay in the deck with their progress: {result.missing.join(", ")}</p>
        </section>
      )}
      {warnings.length > 0 && (
        <section>
          <h3 className="font-semibold">Warnings</h3>
          <ul className="list-disc pl-6">
            {warnings.map((w, i) => (
              <li key={i}>
                {w.row ? `Row ${w.row}: ` : ""}
                {w.message}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex gap-3">
        <Link
          href={`/decks/${result.deckId}`}
          className={buttonClass("primary")}
        >
          <Icon name="play" size={18} />
          Open deck
        </Link>
        <Link
          href="/library"
          className={buttonClass("secondary")}
        >
          Back to Library
        </Link>
      </div>
    </div>
  );
}

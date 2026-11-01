import Link from "next/link";
import type { ImportResult } from "@/shared/schemas/import";

/** README item 15: deck name, cards added and updated, and the two actions. */
export function ImportSuccess({ deckName, result }: { deckName: string; result: ImportResult }) {
  return (
    <div role="status" className="flex max-w-lg flex-col gap-4">
      <h2 className="text-3xl font-semibold">Saved to {deckName}</h2>
      <p className="text-lg">
        {result.added} {result.added === 1 ? "card" : "cards"} added, {result.updated} updated.
      </p>
      <div className="flex gap-3">
        <Link
          href={`/decks/${result.deckId}`}
          className="flex min-h-11 items-center rounded-full bg-primary px-8 text-on-primary"
        >
          Open deck
        </Link>
        <Link
          href="/library"
          className="flex min-h-11 items-center rounded-full px-6 text-on-surface outline outline-1 outline-outline"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}

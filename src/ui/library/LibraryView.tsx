import Link from "next/link";
import { useState } from "react";
import { matchesQuery } from "@/domain/text-match";
import type { Library } from "@/shared/schemas/library";
import { EditDeckPanel } from "@/ui/deck/edit-deck/EditDeck";
import { DeckTile } from "@/ui/deck-tile/DeckTile";
import { Icon } from "@/ui/icons/Icon";
import { DeckMenu } from "./DeckMenu";
import { MasteryBar } from "@/ui/mastery-bar/MasteryBar";
import { buttonClass, FOCUS_RING, PRESSED } from "@/ui/button/button-class";

export interface LibraryViewProps {
  library: Library;
  busy: boolean;
  /** Set when the session could not be created; shown without blaming the learner. */
  startError: string | null;
  onStart: (scope: "all" | "weak") => void;
  /** Search text (L6). Decks match by name or any topic name. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Called after a deck is edited or deleted from its menu, so the Library reloads. */
  onDeckChanged: () => void;
}

/** Library screen (L1 to L5, L7, L8): Today panel, then decks in groups. Presentational; the data comes in as props. */
export function LibraryView({
  library,
  busy,
  startError,
  onStart,
  query,
  onQueryChange,
  onDeckChanged,
}: LibraryViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { today } = library;
  const groups = library.groups
    .map((g) => ({
      ...g,
      decks: g.decks.filter(
        (d) => matchesQuery(d.name, query) || d.topics.some((t) => matchesQuery(t, query)),
      ),
    }))
    .filter((g) => g.decks.length > 0);
  const noDecks = library.groups.length === 0;
  const length = today.sessionLength === "all" ? "all due" : `${today.sessionLength} cards`;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-headline-lg font-semibold">Library</h1>
        {!noDecks && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block w-full sm:w-72">
              <span className="sr-only">Search decks and topics</span>
              <input
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search decks and topics"
                className="min-h-11 w-full rounded-full border border-outline-variant bg-surface-card pl-5 pr-11 text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                <Icon name="search" />
              </span>
            </label>
            <Link href="/import" className={buttonClass("primary")}>
              <Icon name="plus" />
              Add deck
            </Link>
          </div>
        )}
      </div>
      {noDecks ? null : (
        <section
          aria-labelledby="today"
          className="mb-8 max-w-6xl rounded-card border border-card-edge bg-surface-card p-6 shadow-card"
        >
          <h2
            id="today"
            className="inline-block rounded-full bg-surface-container-high px-3 py-1 text-label-md font-semibold text-primary"
          >
            Today
          </h2>
          <p className="mt-3 text-body-lg">
            <span className="text-display font-bold">{today.dueCount}</span>{" "}
            {today.dueCount === 1 ? "card" : "cards"} due in {today.decksWithDue}{" "}
            {today.decksWithDue === 1 ? "deck" : "decks"}. Sessions are {length}.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || today.startableCount === 0}
              onClick={() => onStart("all")}
              className={buttonClass("primary")}
            >
              <Icon name="play" size={18} />
              Start practice
            </button>
            <button
              type="button"
              disabled={busy || today.weakCount === 0}
              onClick={() => onStart("weak")}
              className={buttonClass("secondary")}
            >
              Weak cards ({today.weakCount})
            </button>
          </div>
          {startError && (
            <p role="alert" className="mt-3 text-on-surface-variant">
              {startError}
            </p>
          )}
        </section>
      )}
      {noDecks ? (
        <section className="flex max-w-xl flex-col items-start gap-3 rounded-card border border-card-edge bg-surface-card p-8 shadow-card">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-surface-container-high text-primary"
          >
            <Icon name="cards" size={28} />
          </span>
          <h2 className="text-headline-md font-semibold">No decks yet</h2>
          <p className="text-on-surface-variant">
            Add a deck from a CSV file with topic, front and back columns.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/import" className={buttonClass("primary")}>
              <Icon name="plus" />
              Add deck
            </Link>
            <a href="/api/v1/imports/template" className={buttonClass("secondary")}>
              <Icon name="download" />
              Download CSV template
            </a>
          </div>
        </section>
      ) : groups.length === 0 ? (
        <p role="status" className="max-w-xl text-on-surface-variant">
          Nothing matches that search. Try a different word.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.name} aria-label={g.name} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-headline-sm font-semibold">{g.name}</h2>
              <span className="rounded-full bg-surface-container-high px-3 py-0.5 text-label-sm text-on-surface-variant">
                {g.decks.length} {g.decks.length === 1 ? "deck" : "decks"}
              </span>
            </div>
            <ul className="grid max-w-6xl gap-4 md:grid-cols-2">
              {g.decks.map((d) => (
                <li
                  key={d.id}
                  className="min-w-0 rounded-card border border-card-edge bg-surface-card p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <DeckTile name={d.name} color={d.color} />
                      <div>
                        <div>
                          <h3 className="text-headline-sm font-semibold">
                            <Link
                              href={`/decks/${d.id}`}
                              className={`flex min-h-11 items-center hover:underline hover:text-primary active:text-primary-container ${PRESSED} ${FOCUS_RING}`}
                            >
                              {d.name}
                            </Link>
                          </h3>
                        </div>
                        <p className="text-body-sm text-on-surface-variant">
                          {d.topicCount} {d.topicCount === 1 ? "topic" : "topics"} · {d.cardCount}{" "}
                          {d.cardCount === 1 ? "card" : "cards"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.dueCount > 0 ? (
                        <span className="rounded-full bg-inverse-surface px-3 py-1 text-label-md font-semibold text-inverse-on-surface">
                          {d.dueCount} due
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-label-md font-semibold text-primary">
                          Up to date
                        </span>
                      )}
                      <DeckMenu deckId={d.id} deckName={d.name} onEdit={() => setEditingId(d.id)} />
                    </div>
                  </div>
                  {editingId === d.id && (
                    <div className="mt-4">
                      <EditDeckPanel
                        deck={d}
                        onClose={() => setEditingId(null)}
                        onChanged={onDeckChanged}
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <MasteryBar mastery={d.mastery} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

import Link from "next/link";
import { matchesQuery } from "@/domain/text-match";
import type { Library } from "@/shared/schemas/library";
import { MasteryBar } from "@/ui/mastery-bar/MasteryBar";
import { buttonClass } from "@/ui/button/button-class";

const SWATCH: Record<string, string> = {
  mist: "bg-card-mist",
  cream: "bg-card-cream",
  peach: "bg-card-peach",
  sage: "bg-card-sage",
  lavender: "bg-card-lavender",
  night: "bg-card-night",
};


export interface LibraryViewProps {
  library: Library;
  busy: boolean;
  /** Set when the session could not be created; shown without blaming the learner. */
  startError: string | null;
  onStart: (scope: "all" | "weak") => void;
  /** Search text (L6). Decks match by name or any topic name. */
  query: string;
  onQueryChange: (query: string) => void;
}

/** Library screen (L1 to L5, L7, L8): Today panel, then decks in groups. Presentational; the data comes in as props. */
export function LibraryView({
  library,
  busy,
  startError,
  onStart,
  query,
  onQueryChange,
}: LibraryViewProps) {
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
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold">Library</h1>
        {!noDecks && (
          <Link href="/import" className={buttonClass("primary")}>
            Add deck
          </Link>
        )}
      </div>
      {noDecks ? null : (
        <>
          <label className="mb-6 block max-w-xl">
            <span className="sr-only">Search decks and topics</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search decks and topics"
              className="min-h-11 w-full rounded-full bg-surface-container px-5 text-on-surface outline outline-1 outline-outline"
            />
          </label>
          <section
            aria-labelledby="today"
            className="mb-8 max-w-3xl rounded-card border border-card-edge bg-surface-card shadow-card p-6"
          >
            <h2 id="today" className="text-2xl font-semibold">
              Today
            </h2>
            <p className="mt-2 text-lg">
              {today.dueCount} {today.dueCount === 1 ? "card" : "cards"} due in {today.decksWithDue}{" "}
              {today.decksWithDue === 1 ? "deck" : "decks"}. Sessions are {length}.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || today.startableCount === 0}
                onClick={() => onStart("all")}
                className={buttonClass("primary")}
              >
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
        </>
      )}
      {noDecks ? (
        <section className="max-w-xl">
          <h2 className="text-2xl font-semibold">No decks yet</h2>
          <p className="mt-2 text-on-surface-variant">
            Add a deck from a CSV file with topic, front and back columns.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/import"
              className={buttonClass("primary")}
            >
              Add deck
            </Link>
            <a
              href="/api/v1/imports/template"
              className={buttonClass("secondary")}
            >
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
            <h2 className="mb-3 text-2xl font-semibold">{g.name}</h2>
            <ul className="grid max-w-5xl gap-4 md:grid-cols-2">
              {g.decks.map((d) => (
                <li key={d.id} className="rounded-card border border-card-edge bg-surface-card shadow-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`h-11 w-11 shrink-0 rounded-2xl outline outline-1 outline-outline-variant ${SWATCH[d.color ?? ""] ?? "bg-surface-container-high"}`}
                      />
                      <div>
                        <h3 className="text-lg font-semibold">
                          <Link
                            href={`/decks/${d.id}`}
                            className="flex min-h-11 items-center hover:underline"
                          >
                            {d.name}
                          </Link>
                        </h3>
                        <p className="text-sm text-on-surface-variant">
                          {d.topicCount} {d.topicCount === 1 ? "topic" : "topics"} · {d.cardCount}{" "}
                          {d.cardCount === 1 ? "card" : "cards"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-primary-container px-3 py-1 text-sm font-semibold text-on-primary-container">
                      {d.dueCount} due
                    </span>
                  </div>
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

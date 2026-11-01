import Link from "next/link";
import type { Library } from "@/shared/schemas/library";
import { MasteryBar } from "@/ui/mastery-bar/MasteryBar";

const SWATCH: Record<string, string> = {
  mist: "bg-card-mist",
  cream: "bg-card-cream",
  peach: "bg-card-peach",
  sage: "bg-card-sage",
  lavender: "bg-card-lavender",
  night: "bg-card-night",
};

const button = "min-h-11 rounded-full px-8 font-semibold disabled:opacity-60";

export interface LibraryViewProps {
  library: Library;
  busy: boolean;
  /** Set when the session could not be created; shown without blaming the learner. */
  startError: string | null;
  onStart: (scope: "all" | "weak") => void;
}

/** Library screen (L1 to L5, L7, L8): Today panel, then decks in groups. Presentational; the data comes in as props. */
export function LibraryView({ library, busy, startError, onStart }: LibraryViewProps) {
  const { today, groups } = library;
  const length = today.sessionLength === "all" ? "all due" : `${today.sessionLength} cards`;
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold">Library</h1>
        <Link href="/import" className={`${button} flex items-center bg-primary text-on-primary`}>
          Add deck
        </Link>
      </div>
      <section aria-labelledby="today" className="mb-8 max-w-3xl rounded-2xl bg-surface-container p-6">
        <h2 id="today" className="text-2xl font-semibold">Today</h2>
        <p className="mt-2 text-lg">
          {today.dueCount} {today.dueCount === 1 ? "card" : "cards"} due in {today.decksWithDue}{" "}
          {today.decksWithDue === 1 ? "deck" : "decks"}. Sessions are {length}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || today.dueCount === 0}
            onClick={() => onStart("all")}
            className={`${button} bg-primary text-on-primary`}
          >
            Start practice
          </button>
          <button
            type="button"
            disabled={busy || today.weakCount === 0}
            onClick={() => onStart("weak")}
            className={`${button} text-on-surface outline outline-1 outline-outline`}
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
      {groups.length === 0 ? (
        <section className="max-w-xl">
          <h2 className="text-2xl font-semibold">No decks yet</h2>
          <p className="mt-2 text-on-surface-variant">
            Add a deck from a CSV file with topic, front and back columns. Your cards are saved on the home server.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/import" className={`${button} flex items-center bg-primary text-on-primary`}>
              Add deck
            </Link>
            <a
              href="/api/v1/imports/template"
              className={`${button} flex items-center text-on-surface outline outline-1 outline-outline`}
            >
              Download CSV template
            </a>
          </div>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.name} aria-label={g.name} className="mb-8">
            <h2 className="mb-3 text-2xl font-semibold">{g.name}</h2>
            <ul className="grid max-w-5xl gap-4 md:grid-cols-2">
              {g.decks.map((d) => (
                <li key={d.id} className="rounded-2xl bg-surface-container p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`h-11 w-11 shrink-0 rounded-2xl outline outline-1 outline-outline-variant ${SWATCH[d.color ?? ""] ?? "bg-surface-container-high"}`}
                      />
                      <div>
                        <h3 className="text-lg font-semibold">
                          <Link href={`/decks/${d.id}`} className="flex min-h-11 items-center hover:underline">
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

import Link from "next/link";
import type { Grade } from "@/shared/enums";
import type { SessionSummary } from "@/shared/schemas/session";

const GRADE_ROWS: { grade: Grade; label: string }[] = [
  { grade: "got_it", label: "Got it" },
  { grade: "nearly", label: "Nearly" },
  { grade: "not_yet", label: "Not yet" },
];

/** Whole minutes, at least 1 once any time has passed; plain text, never a timer. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return "under a minute";
  const minutes = Math.max(1, Math.round(ms / 60000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * Session summary (R11): counts by grade as text, time spent, up to three cards to go again,
 * Practise the misses (only when there are misses) and Back to Library. Calm copy, no streaks.
 */
export function SummaryView({
  summary,
  starting,
  failed,
  onPractiseMisses,
}: {
  summary: SessionSummary;
  starting: boolean;
  failed: boolean;
  onPractiseMisses: () => void;
}) {
  const hasMisses = summary.missIds.length > 0;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-8">
      <h1 className="text-3xl font-semibold">Session summary</h1>
      <section aria-label="Results" className="flex flex-col gap-4 rounded-3xl bg-surface-container-low p-6">
        <p className="text-lg">
          {summary.gradedCount} {summary.gradedCount === 1 ? "card" : "cards"} in {formatDuration(summary.durationMs)}
        </p>
        <ul className="flex flex-wrap gap-3">
          {GRADE_ROWS.map(({ grade, label }) => (
            <li key={grade} className="rounded-full bg-surface-container-high px-4 py-2 font-semibold">
              {summary.counts[grade]} {label}
            </li>
          ))}
        </ul>
      </section>
      {summary.goAgain.length > 0 && (
        <section aria-label="Cards to go again" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Cards to go again</h2>
          <ul className="flex flex-col gap-3">
            {summary.goAgain.map((c) => (
              <li key={c.cardId} className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-sm text-on-surface-variant">
                  {c.deckName} · {c.topic}
                </p>
                <p className="text-lg">{c.front}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {failed && (
        <p role="alert" className="text-error">
          Could not start that session. Please try again.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {hasMisses && (
          <button
            type="button"
            disabled={starting}
            onClick={onPractiseMisses}
            className="min-h-11 rounded-full bg-primary px-8 text-on-primary disabled:opacity-60"
          >
            Practise the misses
          </button>
        )}
        <Link href="/library" className="flex min-h-11 items-center justify-center rounded-full px-8 text-on-surface outline outline-1 outline-outline">
          Back to Library
        </Link>
      </div>
    </div>
  );
}

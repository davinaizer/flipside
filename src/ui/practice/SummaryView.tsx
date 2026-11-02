import Link from "next/link";
import type { Grade } from "@/shared/enums";
import type { SessionSummary } from "@/shared/schemas/session";
import { Icon } from "@/ui/icons/Icon";
import { GRADE_TONE } from "./GradeBar";
import { buttonClass } from "@/ui/button/button-class";

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-8">
      <h1 className="text-headline-lg font-semibold">Session summary</h1>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section aria-label="Results" className="flex flex-col gap-4 rounded-card border border-card-edge bg-surface-card p-6 shadow-card">
          <p className="flex items-center gap-2 text-body-lg">
            <Icon name="clock" />
            {summary.gradedCount} {summary.gradedCount === 1 ? "card" : "cards"} in {formatDuration(summary.durationMs)}
          </p>
          <ul className="flex flex-wrap gap-3">
            {GRADE_ROWS.map(({ grade, label }) => (
              <li key={grade} className={`rounded-full px-4 py-2 font-semibold ${GRADE_TONE[grade]}`}>
                {summary.counts[grade]} {label}
              </li>
            ))}
          </ul>
        </section>
        {summary.goAgain.length > 0 && (
          <section aria-label="Cards to go again" className="flex flex-col gap-3 rounded-card border border-card-edge bg-surface-card p-6 shadow-card">
            <h2 className="text-headline-md font-semibold">Cards to go again</h2>
            <ul className="flex flex-col gap-3">
              {summary.goAgain.map((c) => (
                <li key={c.cardId} className="rounded-2xl bg-box-not-yet p-4 text-on-box-not-yet">
                  <p className="text-body-sm">
                    {c.deckName} · {c.topic}
                  </p>
                  <p className="text-body-lg">{c.front}</p>
                </li>
              ))}
            </ul>
            {hasMisses && (
              <button type="button" disabled={starting} onClick={onPractiseMisses} className={buttonClass("secondary", { extra: "w-full" })}>
                <Icon name="play" size={18} />
                Practise the misses
              </button>
            )}
          </section>
        )}
      </div>
      {failed && (
        <p role="alert" className="text-error">
          Could not start that session. Please try again.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {hasMisses && summary.goAgain.length === 0 && (
          <button type="button" disabled={starting} onClick={onPractiseMisses} className={buttonClass("secondary")}>
            <Icon name="play" size={18} />
            Practise the misses
          </button>
        )}
        <Link href="/library" className={buttonClass("primary")}>
          <Icon name="home" />
          Back to Library
        </Link>
      </div>
    </div>
  );
}

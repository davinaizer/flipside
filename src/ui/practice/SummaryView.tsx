import Link from "next/link";
import type { Grade } from "@/shared/enums";
import type { SessionSummary } from "@/shared/schemas/session";
import { Icon, type IconName } from "@/ui/icons/Icon";
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

export interface SummaryViewModel {
  deckLabel: string;
  cardsPractised: number;
  time: string;
  grades: { grade: Grade; label: string; count: number }[];
  revisit: { cardId: string; grade: Grade; topic: string; question: string }[];
  /** Count badge on the Cards to revisit panel and on Practise those now: every miss, not only the three shown. */
  revisitCount: number;
}

/** R18 figures for the summary, straight from the session summary so they match it. */
export function summaryViewModel(summary: SessionSummary): SummaryViewModel {
  return {
    deckLabel: summary.severalDecks ? "Several decks" : (summary.deckName ?? ""),
    cardsPractised: summary.gradedCount,
    time: formatDuration(summary.durationMs),
    grades: GRADE_ROWS.map(({ grade, label }) => ({ grade, label, count: summary.counts[grade] })),
    // goAgain holds only Not yet cards (max three).
    revisit: summary.goAgain.slice(0, 3).map((c) => ({
      cardId: c.cardId,
      grade: "not_yet" as Grade,
      topic: c.topic,
      question: c.front,
    })),
    revisitCount: summary.missIds.length,
  };
}

const GRADE_ICON: Record<Grade, IconName> = {
  got_it: "checkCircle",
  nearly: "trend",
  not_yet: "refresh",
};

/** Ring of cards practised out of cards planned; the count sits inside, so the ring is decoration. */
function CountRing({ count, planned }: { count: number; planned: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fraction = planned > 0 ? Math.min(1, count / planned) : 1;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 88 88" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-outline-variant"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fraction)}
        />
      </svg>
      <p className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className="text-headline-md font-semibold">{count}</span>
        <span className="text-body-sm">{count === 1 ? "card" : "cards"}</span>
      </p>
    </div>
  );
}

/**
 * Session summary (R11, R18): deck card with a count ring, time and grade chips (icon, label, count),
 * a Cards to revisit panel with Practise those now (only when there are misses) and Back to Library.
 * Calm copy, no streaks.
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
  const vm = summaryViewModel(summary);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-8">
      <h1 className="text-headline-lg font-semibold">Session summary</h1>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section
          aria-label="Results"
          className="flex flex-col gap-5 rounded-card border border-card-edge bg-surface-card p-6 shadow-card"
        >
          <h2 className="text-headline-md font-semibold">{vm.deckLabel}</h2>
          <div className="flex items-center gap-4 rounded-2xl bg-surface-container p-4">
            <CountRing count={vm.cardsPractised} planned={summary.session.plannedCount} />
            <p className="flex items-center gap-2 text-body-lg">
              <Icon name="clock" />
              Time spent: {vm.time}
            </p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {vm.grades.map(({ grade, label, count }) => (
              <li
                key={grade}
                className={`flex items-center gap-2 rounded-full px-4 py-2 font-semibold ${GRADE_TONE[grade]}`}
              >
                <Icon name={GRADE_ICON[grade]} size={18} />
                {count} {label}
              </li>
            ))}
          </ul>
        </section>
        {vm.revisitCount > 0 && (
          <section
            aria-label="Cards to revisit"
            className="flex flex-col gap-3 rounded-card border border-card-edge bg-surface-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-headline-md font-semibold">Cards to revisit</h2>
              <span className="rounded-full bg-box-not-yet px-3 py-1 text-body-sm font-semibold text-on-box-not-yet">
                {vm.revisitCount} for review
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {vm.revisit.map((c) => (
                <li
                  key={c.cardId}
                  className="flex flex-col gap-2 rounded-2xl bg-box-not-yet p-4 text-on-box-not-yet"
                >
                  <p className="flex items-center gap-2 text-body-sm font-semibold">
                    <Icon name={GRADE_ICON[c.grade]} size={16} />
                    Not yet · {c.topic}
                  </p>
                  <p className="text-body-lg">{c.question}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={starting}
              onClick={onPractiseMisses}
              className={buttonClass("secondary", { extra: "w-full" })}
            >
              <Icon name="play" size={18} />
              Practise those now ({vm.revisitCount} {vm.revisitCount === 1 ? "card" : "cards"})
            </button>
          </section>
        )}
      </div>
      {failed && (
        <p role="alert" className="text-error">
          Could not start that session. Please try again.
        </p>
      )}
      <div className="flex justify-end">
        <Link href="/library" className={buttonClass("primary")}>
          <Icon name="home" />
          Back to Library
        </Link>
      </div>
    </div>
  );
}

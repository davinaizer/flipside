import type { Stats } from "@/shared/schemas/stats";
import { ByDeckTable } from "./by-deck/ByDeckTable";
import { FocusNext, type FocusTopic } from "./focus-next/FocusNext";
import { PracticeChart } from "./PracticeChart";

export type Range = "week" | "month";

const RANGES: { key: Range; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

function Tile({ label, value, change }: { label: string; value: string; change: string | null }) {
  return (
    <li className="rounded-card border border-card-edge bg-surface-card shadow-card p-6">
      <p className="text-base text-on-surface-variant">{label}</p>
      <p className="mt-2 text-4xl font-semibold">{value}</p>
      <p className="mt-2 text-base text-on-surface-variant">{change ?? "No earlier figure to compare"}</p>
    </li>
  );
}

export interface ProgressViewProps {
  stats: Stats;
  range: Range;
  onRangeChange: (range: Range) => void;
  practising?: boolean;
  practiseError?: string | null;
  onPractise?: (topic: FocusTopic) => void;
}

/** Progress screen (S1, S5): range switch and the four tiles. Mastery-based sections come with later tasks. No streaks or badges (PRD section 7). */
export function ProgressView({ stats, range, onRangeChange, practising = false, practiseError = null, onPractise = () => {} }: ProgressViewProps) {
  const { current, changes } = stats;
  const rate = current.gotItRate === null ? "–" : `${Math.round(current.gotItRate * 100)}%`;
  const time = current.medianSeconds === null ? "–" : `${Math.round(current.medianSeconds)} s`;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold">Progress</h1>
        <div role="group" aria-label="Range" className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={r.key === range}
              onClick={() => onRangeChange(r.key)}
              className={`min-h-11 rounded-full px-6 font-semibold ${
                r.key === range
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface outline outline-1 outline-outline"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {stats.hasReviews ? (
        <div className="grid gap-6">
        <ul className="grid max-w-4xl gap-4 sm:grid-cols-2">
          <Tile label="Cards reviewed" value={String(current.cardsReviewed)} change={changes.cardsReviewed} />
          <Tile label="Got it rate" value={rate} change={changes.gotItRate} />
          <Tile label="Time per card" value={time} change={changes.timePerCard} />
          <Tile
            label="Days practised"
            value={`${current.daysPractised} of ${current.daysInWindow}`}
            change={changes.daysPractised}
          />
        </ul>
        <PracticeChart bars={stats.bars} range={range} />
        <FocusNext topics={stats.focusNext} busy={practising} error={practiseError} onPractise={onPractise} />
        <ByDeckTable decks={stats.byDeck} />
        </div>
      ) : (
        <section className="max-w-2xl rounded-card border border-card-edge bg-surface-card shadow-card p-6">
          <h2 className="text-2xl font-semibold">Nothing to show yet</h2>
          <p className="mt-2 text-lg">
            After your first practice session, this page shows how many cards you reviewed, how
            often you got them, how long each card took and which days you practised.
          </p>
        </section>
      )}
    </>
  );
}

import { Icon, type IconName } from "@/ui/icons/Icon";
import type { Stats } from "@/shared/schemas/stats";
import { ByDeckTable } from "./by-deck/ByDeckTable";
import { FocusNext, type FocusTopic } from "./focus-next/FocusNext";
import { PracticeChart } from "./PracticeChart";

export type Range = "week" | "month";

const RANGES: { key: Range; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

const TILE_TONE = {
  lavender: "bg-card-lavender text-on-card-lavender",
  mist: "bg-card-mist text-on-card-mist",
  sage: "bg-card-sage text-on-card-sage",
  peach: "bg-card-peach text-on-card-peach",
} as const;

function Tile({
  label,
  value,
  change,
  icon,
  tone,
}: {
  label: string;
  value: string;
  change: string | null;
  icon: IconName;
  tone: keyof typeof TILE_TONE;
}) {
  return (
    <li className={`rounded-card p-6 shadow-card ${TILE_TONE[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-label-md font-semibold uppercase">{label}</p>
        <Icon name={icon} />
      </div>
      <p className="mt-3 text-display font-bold">{value}</p>
      <p className="mt-2 text-body-md">{change ?? "No earlier figure to compare"}</p>
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

/** Progress screen (S1, S5): range switch and the four tiles. Tiles, chart, Focus next (S3) and By deck (S4). No streaks or badges (PRD section 7). */
export function ProgressView({ stats, range, onRangeChange, practising = false, practiseError = null, onPractise = () => {} }: ProgressViewProps) {
  const { current, changes } = stats;
  const rate = current.gotItRate === null ? "–" : `${Math.round(current.gotItRate * 100)}%`;
  const time = current.medianSeconds === null ? "–" : `${Math.round(current.medianSeconds)} s`;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-semibold">Progress</h1>
          <p className="text-on-surface-variant">How much you practised and how well you know it.</p>
        </div>
        <div role="group" aria-label="Range" className="flex gap-1 rounded-full bg-surface-container p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={r.key === range}
              onClick={() => onRangeChange(r.key)}
              className={`min-h-11 rounded-full px-6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                r.key === range
                  ? "bg-surface-card text-primary shadow-card"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {stats.hasReviews ? (
        <div className="grid max-w-6xl gap-6">
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Cards reviewed" value={String(current.cardsReviewed)} change={changes.cardsReviewed} icon="cards" tone="lavender" />
            <Tile label="Got it rate" value={rate} change={changes.gotItRate} icon="checkCircle" tone="mist" />
            <Tile label="Time per card" value={time} change={changes.timePerCard} icon="clock" tone="sage" />
            <Tile
              label="Days practised"
              value={`${current.daysPractised} of ${current.daysInWindow}`}
              change={changes.daysPractised}
              icon="calendar"
              tone="peach"
            />
          </ul>
          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <PracticeChart bars={stats.bars} range={range} />
            <FocusNext topics={stats.focusNext} busy={practising} error={practiseError} onPractise={onPractise} />
          </div>
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

import type { Stats } from "@/shared/schemas/stats";
import type { Range } from "./ProgressView";

type Bar = Stats["bars"][number];

const fmt = (start: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${start}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

function label(bar: Bar, range: Range) {
  return range === "week"
    ? fmt(bar.start, { weekday: "short" })
    : fmt(bar.start, { day: "numeric", month: "short" });
}

/** Text alternative: the same figures the bars show, with the current period named. */
function summary(bars: Bar[], range: Range) {
  const unit = range === "week" ? "day" : "week starting";
  const parts = bars.map(
    (b) => `${unit} ${label(b, range)}: ${b.cardsReviewed}${b.current ? " (current)" : ""}`,
  );
  return `Cards practised per ${range === "week" ? "day" : "week"}. ${parts.join("; ")}.`;
}

/**
 * Practice frequency (S2): CSS bars, no chart library. Each bar prints its value; the current
 * period is marked by a text tag and a heavier outline as well as the colour (PRD section 8).
 */
export function PracticeChart({ bars, range }: { bars: Bar[]; range: Range }) {
  const max = Math.max(1, ...bars.map((b) => b.cardsReviewed));
  return (
    <section
      className="rounded-card border border-card-edge bg-surface-card shadow-card p-6"
      aria-labelledby="practice-chart-title"
    >
      <h2 id="practice-chart-title" className="text-headline-md font-semibold">
        {range === "week" ? "Cards practised each day" : "Cards practised each week"}
      </h2>
      <div role="img" aria-label={summary(bars, range)} className="mt-4">
        <ol aria-hidden="true" className="flex h-48 items-end gap-2">
          {bars.map((b) => (
            <li
              key={b.start}
              data-current={b.current}
              className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
            >
              <span className="text-base font-semibold">{b.cardsReviewed}</span>
              <span
                className={`mt-1 block rounded-full ${
                  b.current
                    ? "bg-primary outline outline-2 outline-offset-2 outline-primary"
                    : "bg-primary-container/40"
                }`}
                style={{ height: `${(b.cardsReviewed / max) * 80}%`, minHeight: "0.25rem" }}
              />
            </li>
          ))}
        </ol>
        <ol aria-hidden="true" className="mt-2 flex gap-2">
          {bars.map((b) => (
            <li
              key={b.start}
              className="min-w-0 flex-1 text-center text-sm text-on-surface-variant"
            >
              {label(b, range)}
              {b.current && (
                <span className="block font-semibold text-on-surface">
                  {range === "week" ? "Today" : "This week"}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

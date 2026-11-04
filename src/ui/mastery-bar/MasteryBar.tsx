import type { DeckSummary } from "@/shared/schemas/library";

type Mastery = DeckSummary["mastery"];

const SEGMENTS = [
  { key: "new", label: "New", bar: "bg-bar-new" },
  { key: "notYet", label: "Not yet", bar: "bg-bar-not-yet" },
  { key: "nearly", label: "Nearly", bar: "bg-bar-nearly" },
  { key: "gotIt", label: "Got it", bar: "bg-bar-got-it" },
] as const;

/** Thin bar (S6). The legend swatches keep their own size. */
export const BAR_HEIGHT = "h-1.5";

/**
 * Mastery bar with a legend. Counts are printed in the legend so colour is never the only
 * signal (PRD section 8); the bar itself is decorative.
 */
export function MasteryBar({ mastery }: { mastery: Mastery }) {
  const total = SEGMENTS.reduce((n, s) => n + mastery[s.key], 0);
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className={`flex ${BAR_HEIGHT} w-full gap-0.5 overflow-hidden rounded-full outline outline-1 outline-outline-variant`}>
        {SEGMENTS.map((s) =>
          mastery[s.key] > 0 ? (
            <div key={s.key} className={s.bar} style={{ width: `${(mastery[s.key] / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-on-surface-variant">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-3 w-3 rounded-full outline outline-1 outline-outline ${s.bar}`} />
            {s.label} {mastery[s.key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

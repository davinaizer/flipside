import type { Stats } from "@/shared/schemas/stats";
import { buttonClass } from "@/ui/button/button-class";

export type FocusTopic = Stats["focusNext"][number];

/** Focus next (S3): the lowest-mastery topics; each starts a session on that topic, ignoring due dates. */
export function FocusNext({
  topics,
  busy,
  error,
  onPractise,
}: {
  topics: FocusTopic[];
  busy: boolean;
  error: string | null;
  onPractise: (topic: FocusTopic) => void;
}) {
  return (
    <section aria-labelledby="focus-next-title" className="rounded-card border border-card-edge bg-surface-card p-6 shadow-card">
      <h2 id="focus-next-title" className="text-headline-md font-semibold">Focus next</h2>
      <p className="text-on-surface-variant">Topics with the lowest mastery</p>
      {topics.length === 0 ? (
        <p className="mt-3 text-body-lg text-on-surface-variant">
          Topics with at least three cards appear here once you have cards to practise.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {topics.map((t) => (
            <li key={`${t.deckId}/${t.topic}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
              <div className="min-w-0">
                <p className="text-body-lg font-semibold">{t.topic}</p>
                <p className="text-body-sm text-on-surface-variant">{t.deckName}</p>
                <p className="text-body-sm">Mastery {Math.round(t.mastery * 100)}%</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPractise(t)}
                aria-label={`Practise ${t.topic}`}
                className={buttonClass("secondary", { size: "compact" })}
              >
                Practise
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 text-base text-error">{error}</p>}
    </section>
  );
}

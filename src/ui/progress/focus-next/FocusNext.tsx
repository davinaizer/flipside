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
    <section aria-labelledby="focus-next-title">
      <h2 id="focus-next-title" className="text-2xl font-semibold">Focus next</h2>
      {topics.length === 0 ? (
        <p className="mt-2 text-lg text-on-surface-variant">
          Topics with at least three cards appear here once you have cards to practise.
        </p>
      ) : (
        <ul className="mt-4 grid max-w-4xl gap-4 sm:grid-cols-3">
          {topics.map((t) => (
            <li key={`${t.deckId}/${t.topic}`} className="flex flex-col rounded-card border border-card-edge bg-surface-card shadow-card p-5">
              <p className="text-lg font-semibold">{t.topic}</p>
              <p className="text-base text-on-surface-variant">{t.deckName}</p>
              <p className="mt-2 text-base">Mastery {Math.round(t.mastery * 100)}%</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPractise(t)}
                aria-label={`Practise ${t.topic}`}
                className={buttonClass("primary", { extra: "mt-4" })}
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

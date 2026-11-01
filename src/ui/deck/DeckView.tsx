import Link from "next/link";
import type { SessionRequest } from "@/shared/schemas/session";
import { MasteryBar } from "@/ui/mastery-bar/MasteryBar";
import { anywayPlan, practisePlan } from "./practice-plan";

export interface DeckTopic {
  topic: string;
  cardCount: number;
  dueCount: number;
  mastery: { new: number; notYet: number; nearly: number; gotIt: number };
  masteredPercent: number;
}

export interface DeckViewProps {
  deck: { id: string; name: string; cardCount: number; topics: DeckTopic[] };
  ticked: Set<string>;
  onToggle: (topic: string) => void;
  busy: boolean;
  startError: string | null;
  onStart: (scope: SessionRequest["scope"]) => void;
}

const button = "min-h-11 rounded-full px-8 font-semibold disabled:opacity-60";

/** Deck page (D1 to D3): topics with counts and mastery, tick boxes, and the Practise actions. Presentational. */
export function DeckView({ deck, ticked, onToggle, busy, startError, onStart }: DeckViewProps) {
  const plan = practisePlan(deck.id, deck.topics, ticked);
  const anyway = anywayPlan(deck.id, deck.topics, ticked);
  return (
    <>
      <Link href="/library" className="mb-2 flex min-h-11 w-fit items-center hover:underline">
        Back to Library
      </Link>
      <h1 className="mb-1 text-4xl font-semibold">{deck.name}</h1>
      <p className="mb-6 text-on-surface-variant">
        {deck.topics.length} {deck.topics.length === 1 ? "topic" : "topics"} · {deck.cardCount}{" "}
        {deck.cardCount === 1 ? "card" : "cards"}
      </p>
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || plan.due === 0}
          onClick={() => onStart(plan.scope)}
          className={`${button} bg-primary text-on-primary`}
        >
          {plan.label}
        </button>
        {anyway && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStart(anyway.scope)}
            className={`${button} text-on-surface outline outline-1 outline-outline`}
          >
            {anyway.label}
          </button>
        )}
      </div>
      {startError && (
        <p role="alert" className="mb-4 text-on-surface-variant">
          {startError}
        </p>
      )}
      <h2 className="mb-3 text-2xl font-semibold">Topics</h2>
      <ul className="grid max-w-5xl gap-4 md:grid-cols-2">
        {deck.topics.map((t) => (
          <li key={t.topic} className="rounded-2xl bg-surface-container p-5">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={ticked.has(t.topic)}
                onChange={() => onToggle(t.topic)}
                className="h-11 w-11 shrink-0"
              />
              <span className="text-lg font-semibold">{t.topic}</span>
            </label>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t.cardCount} {t.cardCount === 1 ? "card" : "cards"} · {t.dueCount} due ·{" "}
              {t.masteredPercent}% mastered
            </p>
            <div className="mt-3">
              <MasteryBar mastery={t.mastery} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

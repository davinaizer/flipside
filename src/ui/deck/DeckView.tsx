import Link from "next/link";
import type { SessionRequest } from "@/shared/schemas/session";
import { DeckTile } from "@/ui/deck-tile/DeckTile";
import { Icon } from "@/ui/icons/Icon";
import { MasteryBar } from "@/ui/mastery-bar/MasteryBar";
import type { EditableDeck } from "./edit-deck/EditDeck";
import { NeedsRewording, type Leech } from "./needs-rewording/NeedsRewording";
import { anywayPlan, practisePlan } from "./practice-plan";
import { buttonClass } from "@/ui/button/button-class";

export interface DeckTopic {
  topic: string;
  cardCount: number;
  dueCount: number;
  mastery: { new: number; notYet: number; nearly: number; gotIt: number };
  masteredPercent: number;
}

export interface DeckViewProps {
  deck: EditableDeck & { newRemaining: number; topics: DeckTopic[] };
  leeches: Leech[];
  ticked: Set<string>;
  onToggle: (topic: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  busy: boolean;
  startError: string | null;
  onStart: (scope: SessionRequest["scope"]) => void;
}

/** Deck page (D1 to D3): topics with counts and mastery, tick boxes, and the Practise actions. Presentational. */
export function DeckView({
  deck,
  leeches,
  ticked,
  onToggle,
  onSelectAll,
  onDeselectAll,
  busy,
  startError,
  onStart,
}: DeckViewProps) {
  const plan = practisePlan(deck.id, deck.topics, ticked, deck.newRemaining);
  const anyway = anywayPlan(deck.id, deck.topics, ticked);
  return (
    <>
      <Link
        href="/library"
        className={buttonClass("secondary", { size: "compact", extra: "mb-4 w-fit" })}
      >
        <Icon name="back" />
        Back to Library
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DeckTile name={deck.name} color={deck.color} size={64} />
          <div>
            <h1 className="text-headline-lg font-semibold">{deck.name}</h1>
            <p className="text-on-surface-variant">
              {deck.groupName ? `${deck.groupName} · ` : ""}
              {deck.topics.length} {deck.topics.length === 1 ? "topic" : "topics"} ·{" "}
              {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {anyway && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStart(anyway.scope)}
              className={buttonClass("secondary")}
            >
              {anyway.label}
            </button>
          )}
          <button
            type="button"
            disabled={busy || plan.startable === 0}
            onClick={() => onStart(plan.scope)}
            className={buttonClass("primary")}
          >
            <Icon name="play" size={18} />
            {plan.label}
          </button>
        </div>
      </div>
      {startError && (
        <p role="alert" className="mb-4 text-on-surface-variant">
          {startError}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-headline-md font-semibold">Topics</h2>
          <p className="text-on-surface-variant">
            Tick topics to practise only those. Leave all unticked to practise everything that is
            due.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSelectAll}
            className={buttonClass("secondary", { size: "compact" })}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className={buttonClass("secondary", { size: "compact" })}
          >
            Deselect all
          </button>
        </div>
      </div>
      <ul className="max-w-6xl divide-y divide-card-edge rounded-card border border-card-edge bg-surface-card shadow-card">
        {deck.topics.map((t) => (
          <li key={t.topic} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            <div className="min-w-0 flex-1 basis-56">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <span className="relative flex size-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={ticked.has(t.topic)}
                    onChange={() => onToggle(t.topic)}
                    className="peer absolute inset-0 size-11 cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className="size-7 rounded-md border-2 border-outline bg-surface-card peer-hover:border-primary peer-active:bg-surface-container-high peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute hidden text-on-primary peer-checked:block"
                  >
                    <Icon name="check" size={18} />
                  </span>
                </span>
                <span className="text-headline-sm font-semibold">{t.topic}</span>
              </label>
              <p className="text-body-sm text-on-surface-variant">
                {t.cardCount} {t.cardCount === 1 ? "card" : "cards"} · {t.dueCount} due ·{" "}
                {t.masteredPercent}% mastered
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-label-md font-semibold ${
                t.dueCount > 0
                  ? "bg-inverse-surface text-inverse-on-surface"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {t.dueCount > 0 ? `${t.dueCount} due` : "None due"}
            </span>
            <div className="w-full lg:w-96">
              <MasteryBar mastery={t.mastery} />
            </div>
          </li>
        ))}
      </ul>
      <NeedsRewording leeches={leeches} />
    </>
  );
}

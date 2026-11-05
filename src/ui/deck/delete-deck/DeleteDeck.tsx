"use client";

import { useState } from "react";
import { api } from "@/ui/api/client";
import { buttonClass, FOCUS_RING, PRESSED } from "@/ui/button/button-class";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What the confirmation says will go (D5). Exported for tests. */
export function deleteSummary(name: string, cardCount: number, reviewCount: number): string {
  return `Delete "${name}"? This hides the deck and its ${plural(cardCount, "card", "cards")} and ${plural(reviewCount, "review record", "review records")}.`;
}

/** The solid confirm button: hover and pressed go to the error container. Exported for tests. */
export const CONFIRM_DELETE_CLASS = `min-h-11 rounded-full bg-error px-8 font-semibold text-on-error hover:bg-error-container hover:text-on-error-container active:bg-error-container active:text-on-error-container ${PRESSED} ${FOCUS_RING} disabled:opacity-60`;

export const DELETE_ERROR =
  "We could not delete the deck just now. It is still here, so please try again.";

/** Deletes through the API client; returns the error message to show, or null on success. Exported for tests. */
export async function deleteDeck(id: string): Promise<string | null> {
  return api.deleteDeck(id).then(
    () => null,
    () => DELETE_ERROR,
  );
}

/** D5: confirm, then DELETE /decks/{id}; the caller reloads the Library. */
export function DeleteDeck({
  deck,
  onDeleted,
}: {
  deck: { id: string; name: string; cardCount: number; reviewCount: number };
  onDeleted: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setBusy(true);
    setError(null);
    const failure = await deleteDeck(deck.id);
    if (!failure) {
      onDeleted();
      return;
    }
    setError(failure);
    setBusy(false);
  }

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={buttonClass("danger")}>
        Delete deck
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Delete deck"
      className="mb-6 max-w-xl rounded-card border border-card-edge bg-surface-card shadow-card p-5"
    >
      <p className="mb-4">{deleteSummary(deck.name, deck.cardCount, deck.reviewCount)}</p>
      {error && (
        <p role="alert" className="mb-4 text-error">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={onDelete} className={CONFIRM_DELETE_CLASS}>
          {busy ? "Deleting..." : "Delete deck"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setAsking(false)}
          className={buttonClass("secondary")}
        >
          Keep deck
        </button>
      </div>
    </div>
  );
}

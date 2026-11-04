"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ANSWER_STYLES, CARD_COLORS } from "@/shared/enums";
import { buttonClass } from "@/ui/button/button-class";
import { DeleteDeck } from "../delete-deck/DeleteDeck";

export interface EditableDeck {
  id: string;
  name: string;
  groupName: string | null;
  color: string | null; // stored as text; an unknown value falls back to mist
  answerStyle: string;
  cardCount: number; // for the delete confirmation (D5)
  reviewCount: number;
}

// Full class names so Tailwind sees them; tokens live in tokens.css.
const SWATCH = {
  mist: "bg-card-mist",
  cream: "bg-card-cream",
  peach: "bg-card-peach",
  sage: "bg-card-sage",
  lavender: "bg-card-lavender",
  night: "bg-card-night",
} as const;

const field = "min-h-11 rounded-xl bg-surface-container-low px-3 outline outline-1 outline-outline";

/** D4: rename, regroup, recolour and change answer style via PATCH /decks/{id}, then refresh the page. */
export function EditDeck({ deck }: { deck: EditableDeck }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary")}>
        Edit deck
      </button>
    );
  }
  return <EditDeckPanel deck={deck} onClose={() => setOpen(false)} />;
}

/** The open panel: the edit form, then Delete deck (D8) kept away from the page's everyday actions. Exported for tests. */
export function EditDeckPanel({ deck, onClose }: { deck: EditableDeck; onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          groupName: f.get("groupName"),
          color: f.get("color"),
          answerStyle: f.get("answerStyle"),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      onClose();
      router.refresh();
    } catch {
      setError("We could not save your changes. Nothing was lost, so please try again.");
    }
    setSaving(false);
  }

  return (
    <div className="mb-6 flex max-w-xl flex-col gap-4">
    <form onSubmit={onSubmit} aria-label="Edit deck" className="flex flex-col gap-4 rounded-card border border-card-edge bg-surface-card shadow-card p-5">
      <label className="flex flex-col gap-1">
        Deck name
        <input name="name" required maxLength={100} defaultValue={deck.name} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        Group (optional)
        <input name="groupName" maxLength={100} defaultValue={deck.groupName ?? ""} className={field} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">Card colour</legend>
        <div className="flex flex-wrap gap-2">
          {CARD_COLORS.map((c) => (
            <label key={c} className="relative cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={c === (deck.color ?? "mist")} className="peer sr-only" />
              <span className={`block size-11 rounded-full outline outline-1 outline-outline ${SWATCH[c]} peer-checked:outline-4 peer-checked:outline-primary peer-hover:outline-primary peer-active:outline-primary peer-active:scale-95 motion-reduce:peer-active:scale-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary`} />
              <span className="sr-only">{c[0].toUpperCase() + c.slice(1)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">Show answers as</legend>
        <div className="flex gap-1 rounded-full bg-surface-container-low p-1">
          {ANSWER_STYLES.map((a) => (
            <label key={a} className="relative flex-1 cursor-pointer">
              <input type="radio" name="answerStyle" value={a} defaultChecked={a === deck.answerStyle} className="peer sr-only" />
              <span className="flex min-h-11 items-center justify-center rounded-full px-3 hover:bg-surface-container-high active:bg-surface-container-highest peer-active:scale-[0.98] motion-reduce:peer-active:scale-100 peer-checked:bg-primary peer-checked:text-on-primary peer-checked:hover:bg-primary-container peer-checked:hover:text-on-primary-container peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                {a === "bullets" ? "Bullet list" : "Paragraph"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-error">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className={buttonClass("primary")}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button type="button" disabled={saving} onClick={onClose} className={buttonClass("secondary")}>
          Cancel
        </button>
      </div>
    </form>
    <DeleteDeck deck={deck} />
    </div>
  );
}

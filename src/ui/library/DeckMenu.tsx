"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon } from "@/ui/icons/Icon";
import { nextItemIndex } from "@/ui/shell/ProfileMenu";

const ITEM =
  "flex min-h-11 w-full items-center rounded-full px-4 text-left font-semibold text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest";

/** The open list, kept apart from the open state so a test can render it open. */
export function DeckMenuItems({ deckId, onEdit }: { deckId: string; onEdit: () => void }) {
  return (
    <div
      role="menu"
      aria-label="Deck actions"
      className="absolute right-0 top-full z-10 mt-1 flex w-48 flex-col gap-1 rounded-card border border-card-edge bg-surface-card p-2 shadow-card"
    >
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={onEdit}
        className={`${ITEM} active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
      >
        Edit deck
      </button>
      <Link
        href={`/import?deckId=${deckId}`}
        role="menuitem"
        tabIndex={-1}
        className={`${ITEM} active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
      >
        Re-import
      </Link>
    </div>
  );
}

/** Ellipsis menu at the top right of a Library deck card (L9): Edit deck and Re-import. */
export function DeckMenu({
  deckId,
  deckName,
  onEdit,
}: {
  deckId: string;
  deckName: string;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = () =>
    Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const list = items();
    const i = nextItemIndex(
      e.key,
      list.indexOf(document.activeElement as HTMLElement),
      list.length,
    );
    if (i !== null) {
      e.preventDefault();
      list[i]?.focus();
    }
  }

  return (
    <div
      ref={root}
      onKeyDown={onKeyDown}
      onClick={(e) => (e.target as HTMLElement).closest('[role="menuitem"]') && setOpen(false)}
      className="relative shrink-0"
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Deck actions for ${deckName}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex size-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
      >
        <Icon name="more" />
      </button>
      {open && <DeckMenuItems deckId={deckId} onEdit={onEdit} />}
    </div>
  );
}

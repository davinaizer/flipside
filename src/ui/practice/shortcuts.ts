import { useEffect } from "react";
import type { Grade } from "@/shared/enums";

export type ShortcutAction = { type: "reveal" } | { type: "grade"; grade: Grade };

const GRADE_KEYS: Record<string, Grade> = { "1": "not_yet", "2": "nearly", "3": "got_it" };

/** Targets that own the keyboard: typing, or a control that Space/Enter already activates. */
function ownsKey(target: EventTarget | null, key: string): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
  if (el.closest?.('[role="dialog"]')) return true;
  return key === " " && ["BUTTON", "A", "SUMMARY"].includes(el.tagName);
}

/**
 * Maps a key press to a Practice action, or null (R14). Space shows the answer on the front;
 * 1, 2 and 3 grade only once the answer is visible. Nothing fires while a dialog is open,
 * inside inputs, with a modifier held, or on key repeat.
 */
export function shortcutFor(
  e: { key: string; target: EventTarget | null; repeat?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean },
  state: { revealed: boolean; dialogOpen: boolean },
): ShortcutAction | null {
  if (state.dialogOpen || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (ownsKey(e.target, e.key)) return null;
  if (e.key === " ") return state.revealed ? null : { type: "reveal" };
  const grade = GRADE_KEYS[e.key];
  return grade && state.revealed ? { type: "grade", grade } : null;
}

export function usePracticeShortcuts(
  state: { revealed: boolean; dialogOpen: boolean },
  on: { reveal: () => void; grade: (g: Grade) => void },
) {
  const { revealed, dialogOpen } = state;
  const { reveal, grade } = on;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const action = shortcutFor(e, { revealed, dialogOpen });
      if (!action) return;
      e.preventDefault();
      if (action.type === "reveal") reveal();
      else grade(action.grade);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, dialogOpen, reveal, grade]);
}

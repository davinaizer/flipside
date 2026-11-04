import { cardState } from "@/server/db/schema";
import type { Box, SchedulerState } from "@/domain/scheduler";
import type { CardStatus, Grade } from "@/shared/enums";

/** The card_state columns the scheduler reads; select them through a left join so a New card gives nulls. */
export const stateColumns = {
  box: cardState.box,
  dueDate: cardState.dueDate,
  reps: cardState.reps,
  lapses: cardState.lapses,
  lastGrade: cardState.lastGrade,
  status: cardState.status,
};

/** A card_state row as the domain sees it: null when the card is New (no row for the profile). */
export function toSchedulerState(r: {
  box: number | null;
  dueDate: string | null;
  reps: number | null;
  lapses: number | null;
  lastGrade: string | null;
  status: string | null;
}): SchedulerState | null {
  if (r.box === null) return null;
  return {
    box: r.box as Box,
    dueDate: r.dueDate!,
    reps: r.reps!,
    lapses: r.lapses!,
    lastGrade: r.lastGrade as Grade | null,
    status: r.status as CardStatus,
  };
}

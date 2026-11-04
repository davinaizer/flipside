/**
 * Five-box scheduler (PRD section 5, R4, N4).
 *
 * Pure: given a card's state before a grade (null for a New card), the grade and
 * the profile's learning day, returns the state after the grade. Re-queueing within
 * a session is the session queue's decision (domain/session-queue), not the scheduler's.
 */
import {
  BOX_INTERVALS_DAYS,
  LAPSE_RULE,
  LEECH_THRESHOLD,
  MAX_BOX,
  MIN_BOX,
} from "../shared/constants";
import type { CardStatus, Grade } from "../shared/enums";
import { addDays, type LocalDate } from "./day";

export type Box = 1 | 2 | 3 | 4 | 5;
export type LapseRule = "reset" | "drop_one";

export interface SchedulerState {
  box: Box;
  dueDate: LocalDate;
  reps: number;
  lapses: number;
  lastGrade: Grade | null;
  status: CardStatus;
}

export interface GradeResult {
  state: SchedulerState;
}

export interface SchedulerOptions {
  lapseRule?: LapseRule;
  leechThreshold?: number;
}

function toBox(n: number): Box {
  return Math.min(MAX_BOX, Math.max(MIN_BOX, n)) as Box;
}

/** The due date for a card that lands in `box` on learning day `today`. */
export function dueDateFor(box: Box, today: LocalDate): LocalDate {
  return addDays(today, BOX_INTERVALS_DAYS[box]);
}

export function applyGrade(
  prev: SchedulerState | null,
  grade: Grade,
  today: LocalDate,
  options: SchedulerOptions = {},
): GradeResult {
  const lapseRule = options.lapseRule ?? LAPSE_RULE;
  const leechThreshold = options.leechThreshold ?? LEECH_THRESHOLD;

  const reps = (prev?.reps ?? 0) + 1;
  let lapses = prev?.lapses ?? 0;
  let box: Box;
  let dueDate: LocalDate;

  switch (grade) {
    case "not_yet": {
      if (prev === null) {
        box = 1;
      } else {
        if (prev.box >= 2) lapses += 1;
        box = lapseRule === "reset" ? 1 : toBox(prev.box - 1);
      }
      dueDate = today;
      break;
    }
    case "nearly": {
      box = prev === null ? 1 : prev.box;
      dueDate = dueDateFor(box, today);
      break;
    }
    case "got_it": {
      box = prev === null ? 2 : toBox(prev.box + 1);
      dueDate = dueDateFor(box, today);
      break;
    }
  }

  let status: CardStatus = prev?.status ?? "active";
  if (status === "active" && lapses >= leechThreshold) status = "leech";

  return {
    state: { box, dueDate, reps, lapses, lastGrade: grade, status },
  };
}

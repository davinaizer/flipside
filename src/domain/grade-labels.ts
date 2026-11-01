/**
 * Grade button sublabels (PRD section 5, R4).
 *
 * The label is derived from the due date applyGrade returns, so it cannot
 * disagree with the outcome of the grade.
 */
import { GRADES, type Grade } from "../shared/enums";
import { daysBetween, type LocalDate } from "./day";
import { applyGrade, type SchedulerOptions, type SchedulerState } from "./scheduler";

export type GradeLabels = Record<Grade, string>;

/** "Again today", "Tomorrow", "In 3 days" for a due date relative to today. */
export function labelForDueDate(today: LocalDate, dueDate: LocalDate): string {
  const days = daysBetween(today, dueDate);
  if (days <= 0) return "Again today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function gradeLabels(
  prev: SchedulerState | null,
  today: LocalDate,
  options: SchedulerOptions = {},
): GradeLabels {
  const labels = {} as GradeLabels;
  for (const grade of GRADES) {
    labels[grade] = labelForDueDate(today, applyGrade(prev, grade, today, options).state.dueDate);
  }
  return labels;
}

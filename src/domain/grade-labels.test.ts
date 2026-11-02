import { describe, expect, it } from "vitest";
import schedulerFixtures from "../../fixtures/domain/scheduler.json";
import fixtures from "../../fixtures/domain/grade-labels.json";
import { GRADES } from "../shared/enums";
import { daysBetween } from "./day";
import { gradeLabels, labelForDueDate } from "./grade-labels";
import { applyGrade, type LapseRule, type SchedulerState } from "./scheduler";

const states = schedulerFixtures.states as Record<string, SchedulerState | null>;
const RULES: LapseRule[] = ["reset", "drop_one"];

describe("gradeLabels fixtures", () => {
  it.each(fixtures.cases)("labels from $from", (c) => {
    for (const lapseRule of RULES)
      expect(gradeLabels(states[c.from], fixtures.today, { lapseRule })).toEqual(c.labels);
  });

  it("covers every scheduler state", () => {
    expect(fixtures.cases.map((c) => c.from).sort()).toEqual(Object.keys(states).sort());
  });
});

describe("label agrees with applyGrade", () => {
  it("every label is derived from the applyGrade due date", () => {
    for (const lapseRule of RULES)
      for (const prev of Object.values(states)) {
        const labels = gradeLabels(prev, fixtures.today, { lapseRule });
        for (const grade of GRADES) {
          const { dueDate } = applyGrade(prev, grade, fixtures.today, { lapseRule }).state;
          expect(labels[grade]).toBe(labelForDueDate(fixtures.today, dueDate));
          const days = daysBetween(fixtures.today, dueDate);
          const expected =
            days === 0 ? "Again today" : days === 1 ? "Tomorrow" : `In ${days} days`;
          expect(labels[grade]).toBe(expected);
        }
      }
  });
});

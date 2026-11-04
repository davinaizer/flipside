import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/domain/scheduler.json";
import { GRADES, type Grade } from "../shared/enums";
import { LAPSE_RULE } from "../shared/constants";
import { applyGrade, type LapseRule, type SchedulerState } from "./scheduler";

type StateKey = keyof typeof fixtures.states;
const states = fixtures.states as Record<StateKey, SchedulerState | null>;

function run(prev: SchedulerState | null, grade: string, lapseRule: string) {
  return applyGrade(prev, grade as Grade, fixtures.today, {
    lapseRule: lapseRule as LapseRule,
  }).state;
}

describe("applyGrade matrix", () => {
  it.each(fixtures.matrix)("$lapseRule: $from + $grade", (c) => {
    expect(run(states[c.from as StateKey], c.grade, c.lapseRule)).toEqual(c.expected);
  });

  it("covers every state times every grade under both lapse rules", () => {
    const keys = new Set(fixtures.matrix.map((c) => `${c.lapseRule}/${c.from}/${c.grade}`));
    for (const rule of ["reset", "drop_one"])
      for (const from of Object.keys(fixtures.states))
        for (const grade of GRADES) expect(keys).toContain(`${rule}/${from}/${grade}`);
    expect(fixtures.matrix).toHaveLength(2 * 6 * 3);
  });
});

describe("applyGrade edge cases", () => {
  it.each(fixtures.edge)("$name", (c) => {
    expect(run(c.prev as SchedulerState, c.grade, c.lapseRule)).toEqual(c.expected);
  });
});

describe("applyGrade defaults", () => {
  it("uses LAPSE_RULE when no rule is given", () => {
    const prev = states.box5;
    const expected = applyGrade(prev, "not_yet", fixtures.today, { lapseRule: LAPSE_RULE });
    expect(applyGrade(prev, "not_yet", fixtures.today)).toEqual(expected);
  });

  it("does not mutate the previous state", () => {
    const prev = { ...states.box3! };
    const copy = { ...prev };
    applyGrade(prev, "got_it", fixtures.today);
    expect(prev).toEqual(copy);
  });
});

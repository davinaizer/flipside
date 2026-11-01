import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/domain/day-boundary.json";
import { addDays, dayStartUtc, daysBetween, learningDay, weekStart } from "./day";

describe("learningDay", () => {
  it.each(fixtures.learningDay)("$name", (c) => {
    expect(learningDay(c.instant, c.timezone, c.dayStartHour)).toBe(c.expected);
  });

  it("accepts a Date", () => {
    expect(learningDay(new Date("2026-01-15T06:30:00Z"), "Europe/London", 7)).toBe("2026-01-14");
  });
});

describe("dayStartUtc", () => {
  it.each(fixtures.dayStartUtc)("$name", (c) => {
    expect(dayStartUtc(c.date, c.timezone, c.dayStartHour).toISOString()).toBe(c.expected);
  });

  it.each(fixtures.dayStartUtc)("round-trips through learningDay: $name", (c) => {
    const start = dayStartUtc(c.date, c.timezone, c.dayStartHour);
    expect(learningDay(start, c.timezone, c.dayStartHour)).toBe(c.date);
    expect(learningDay(start.getTime() - 1, c.timezone, c.dayStartHour)).toBe(addDays(c.date, -1));
  });
});

describe("addDays", () => {
  it.each(fixtures.addDays)("$date + $days = $expected", (c) => {
    expect(addDays(c.date, c.days)).toBe(c.expected);
  });
});

describe("daysBetween", () => {
  it.each(fixtures.daysBetween)("$from to $to = $expected", (c) => {
    expect(daysBetween(c.from, c.to)).toBe(c.expected);
  });
});

describe("weekStart", () => {
  it.each(fixtures.weekStart)("$name", (c) => {
    expect(weekStart(c.date)).toBe(c.expected);
  });

  it.each(fixtures.learningWeekStart)("of the local day: $name", (c) => {
    expect(weekStart(learningDay(c.instant, c.timezone, c.dayStartHour))).toBe(c.expected);
  });
});

describe("invalid input", () => {
  const fns: Record<string, (...args: never[]) => unknown> = { addDays, weekStart, learningDay };
  it.each(fixtures.invalid)("$name throws RangeError", (c) => {
    const fn = fns[c.fn] as (...args: unknown[]) => unknown;
    expect(() => fn(...c.args)).toThrow(RangeError);
  });
});

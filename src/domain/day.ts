/**
 * Day-boundary maths (PRD sections 2, 5 and N8).
 *
 * A learning day is a plain calendar date (YYYY-MM-DD) in the profile's timezone,
 * starting at the profile's day start hour. A review at 06:30 local time with a
 * day start hour of 7 counts toward the previous day. Weeks start on Monday.
 * Uses Intl only, so the same rules run on the server and in the browser.
 */

export type LocalDate = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(ms: number, timeZone: string): WallClock {
  const parts: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour! % 24,
    minute: parts.minute!,
    second: parts.second!,
  };
}

/** Offset of the timezone from UTC at the given instant, in milliseconds. */
function offsetMs(ms: number, timeZone: string): number {
  const w = wallClock(ms, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

function toMs(instant: Date | string | number): number {
  const ms = instant instanceof Date ? instant.getTime() : new Date(instant).getTime();
  if (Number.isNaN(ms)) throw new RangeError(`Invalid instant: ${String(instant)}`);
  return ms;
}

function checkHour(dayStartHour: number): void {
  if (!Number.isInteger(dayStartHour) || dayStartHour < 0 || dayStartHour > 23) {
    throw new RangeError(`Invalid day start hour: ${dayStartHour}`);
  }
}

function parseDate(date: LocalDate): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`Invalid date: ${date}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`Invalid date: ${date}`);
  }
  return [y, mo, d];
}

function formatDate(y: number, mo: number, d: number): LocalDate {
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return formatDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Adds (or with a negative number subtracts) whole calendar days. */
export function addDays(date: LocalDate, days: number): LocalDate {
  if (!Number.isInteger(days)) throw new RangeError(`Invalid day count: ${days}`);
  const [y, mo, d] = parseDate(date);
  return fromUtcMs(Date.UTC(y, mo - 1, d) + days * MS_PER_DAY);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const [fy, fm, fd] = parseDate(from);
  const [ty, tm, td] = parseDate(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

/** The learning day an instant belongs to, in the profile's timezone and day start hour. */
export function learningDay(
  instant: Date | string | number,
  timeZone: string,
  dayStartHour: number,
): LocalDate {
  checkHour(dayStartHour);
  const w = wallClock(toMs(instant), timeZone);
  const date = formatDate(w.year, w.month, w.day);
  return w.hour < dayStartHour ? addDays(date, -1) : date;
}

/** Monday of the week containing the date (weeks run Monday to Sunday). */
export function weekStart(date: LocalDate): LocalDate {
  const [y, mo, d] = parseDate(date);
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/**
 * The UTC instant at which a learning day starts: the date at the day start hour,
 * local time. If that wall time is skipped by a clock change, the day starts when
 * the clocks jump; if it occurs twice, the first occurrence wins.
 */
export function dayStartUtc(date: LocalDate, timeZone: string, dayStartHour: number): Date {
  checkHour(dayStartHour);
  const [y, mo, d] = parseDate(date);
  const guess = Date.UTC(y, mo - 1, d, dayStartHour);
  const before = offsetMs(guess - 12 * MS_PER_HOUR, timeZone);
  const after = offsetMs(guess + 12 * MS_PER_HOUR, timeZone);
  const matches = [guess - before, guess - after]
    .filter((ms) => {
      const w = wallClock(ms, timeZone);
      return w.year === y && w.month === mo && w.day === d && w.hour === dayStartHour;
    })
    .sort((a, b) => a - b);
  return new Date(matches[0] ?? guess - before);
}

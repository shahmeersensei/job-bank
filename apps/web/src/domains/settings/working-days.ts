/**
 * Working-day arithmetic for SLAs (PRD: company verification ≤ 2 working days). Dates are
 * calendar days in Pakistan time (UTC+5 all year, no daylight saving), as 'YYYY-MM-DD'.
 * Pure functions: the caller supplies the calendar (weekend setting + holidays table).
 */
export interface WorkingCalendar {
  /** 0 = Sunday … 6 = Saturday (setting `calendar.weekend_days`). */
  weekendDays: readonly number[];
  /** Active holidays as 'YYYY-MM-DD'. */
  holidays: ReadonlySet<string>;
}

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Stops a misconfigured calendar (every day off) from looping forever. */
const MAX_SCAN_DAYS = 3660;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(date: string): number {
  if (!ISO_DATE.test(date)) throw new RangeError(`Expected YYYY-MM-DD, got "${date}"`);
  return Date.parse(`${date}T00:00:00Z`);
}

const fromUtcMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The calendar date in Pakistan at a given instant. */
export function pktDate(at: Date): string {
  return fromUtcMs(at.getTime() + PKT_OFFSET_MS);
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function isWorkingDay(date: string, calendar: WorkingCalendar): boolean {
  const weekday = new Date(toUtcMs(date)).getUTCDay();
  return !calendar.weekendDays.includes(weekday) && !calendar.holidays.has(date);
}

/**
 * The date of the Nth working day after `date` (the start day itself never counts).
 * Monday + 2 → Wednesday; Saturday + 2 with Sunday off → Tuesday.
 */
export function addWorkingDays(date: string, days: number, calendar: WorkingCalendar): string {
  if (!Number.isInteger(days) || days < 0) throw new RangeError('days must be a whole number ≥ 0');
  let current = date;
  let remaining = days;
  for (let scanned = 0; remaining > 0; scanned++) {
    if (scanned > MAX_SCAN_DAYS) throw new RangeError('The calendar has no working days');
    current = addDays(current, 1);
    if (isWorkingDay(current, calendar)) remaining--;
  }
  return current;
}

/** Working days in (from, to] — how many working days have passed since `from`. */
export function workingDaysBetween(from: string, to: string, calendar: WorkingCalendar): number {
  const end = toUtcMs(to);
  let count = 0;
  for (let ms = toUtcMs(from) + DAY_MS; ms <= end; ms += DAY_MS) {
    if (isWorkingDay(fromUtcMs(ms), calendar)) count++;
  }
  return count;
}

/** Last day (inclusive, Pakistan time) to act on something submitted at `submittedAt`. */
export function slaDueDate(
  submittedAt: Date,
  workingDays: number,
  calendar: WorkingCalendar,
): string {
  return addWorkingDays(pktDate(submittedAt), workingDays, calendar);
}

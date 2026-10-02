import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  isWorkingDay,
  pktDate,
  slaDueDate,
  workingDaysBetween,
  type WorkingCalendar,
} from './working-days';

// 2026-10-05 is a Monday.
const sundayOff: WorkingCalendar = { weekendDays: [0], holidays: new Set() };

describe('working-day calendar', () => {
  it('reads the calendar date in Pakistan time (UTC+5)', () => {
    expect(pktDate(new Date('2026-10-05T18:59:59Z'))).toBe('2026-10-05');
    expect(pktDate(new Date('2026-10-05T19:00:00Z'))).toBe('2026-10-06');
  });

  it('skips weekly days off and active holidays', () => {
    expect(isWorkingDay('2026-10-04', sundayOff)).toBe(false); // Sunday
    expect(isWorkingDay('2026-10-10', sundayOff)).toBe(true); // Saturday works
    const withHoliday = { ...sundayOff, holidays: new Set(['2026-11-09']) };
    expect(isWorkingDay('2026-11-09', withHoliday)).toBe(false); // Iqbal Day
  });

  it('adds working days without counting the start day', () => {
    expect(addWorkingDays('2026-10-05', 2, sundayOff)).toBe('2026-10-07'); // Mon → Wed
    expect(addWorkingDays('2026-10-09', 2, sundayOff)).toBe('2026-10-12'); // Fri → Mon (skip Sun)
    expect(addWorkingDays('2026-10-04', 1, sundayOff)).toBe('2026-10-05'); // Sun → Mon
    expect(addWorkingDays('2026-10-05', 0, sundayOff)).toBe('2026-10-05');
  });

  it('honours a Saturday + Sunday weekend and back-to-back holidays', () => {
    const calendar = { weekendDays: [0, 6], holidays: new Set(['2026-12-25', '2026-12-28']) };
    // Thu 24 Dec + 2: Fri 25 holiday, Sat/Sun off, Mon 28 holiday → Tue 29, Wed 30.
    expect(addWorkingDays('2026-12-24', 2, calendar)).toBe('2026-12-30');
  });

  it('counts working days elapsed between two dates', () => {
    expect(workingDaysBetween('2026-10-05', '2026-10-05', sundayOff)).toBe(0);
    expect(workingDaysBetween('2026-10-05', '2026-10-12', sundayOff)).toBe(6); // Tue–Sat + Mon
  });

  it('gives the verification SLA due date from the submission instant', () => {
    // Submitted Saturday 23:30 PKT = Saturday; 2 working days → Tuesday (Sunday off).
    expect(slaDueDate(new Date('2026-10-10T18:30:00Z'), 2, sundayOff)).toBe('2026-10-13');
  });

  it('refuses calendars with no working days and bad input', () => {
    const allOff = { weekendDays: [0, 1, 2, 3, 4, 5, 6], holidays: new Set<string>() };
    expect(() => addWorkingDays('2026-10-05', 1, allOff)).toThrow(/no working days/);
    expect(() => addWorkingDays('2026-10-05', -1, sundayOff)).toThrow(RangeError);
    expect(() => addWorkingDays('05/10/2026', 1, sundayOff)).toThrow(RangeError);
  });
});

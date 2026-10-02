import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './date';

describe('date formatting (Asia/Karachi, UTC+5)', () => {
  it('formats in Pakistan time regardless of the machine zone', () => {
    // 12:30 UTC = 17:30 PKT
    expect(formatDateTime('2026-10-01T12:30:00Z')).toMatch(/^1 Oct 2026,? 5:30\s?pm$/i);
    // 21:00 UTC on 30 Sep = 02:00 PKT on 1 Oct
    expect(formatDate('2026-09-30T21:00:00Z')).toBe('1 Oct 2026');
  });
});

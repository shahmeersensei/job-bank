import { describe, expect, it } from 'vitest';
import { formatCnic, isValidCnic, maskCnic } from './cnic';
import { distanceBand, distanceTone, formatDistance } from './distance';
import { formatPkMobileDisplay, formatPkMobileNational, normalizePkMobile } from './phone';

describe('normalizePkMobile', () => {
  it.each(['03001234567', '+923001234567', '923001234567', '0092 300 1234567', '300-1234567'])(
    'normalizes %s to E.164',
    (input) => expect(normalizePkMobile(input)).toBe('+923001234567'),
  );

  it.each(['', '0211234567', '+92212345678', '30012345', '4001234567'])('rejects %j', (input) => {
    expect(normalizePkMobile(input)).toBeNull();
  });

  it('formats national and display forms', () => {
    expect(formatPkMobileNational('300')).toBe('300');
    expect(formatPkMobileNational('3001234')).toBe('300 1234');
    expect(formatPkMobileDisplay('+923001234567')).toBe('+92 300 1234567');
  });
});

describe('CNIC helpers', () => {
  it('formats progressively', () => {
    expect(formatCnic('42101')).toBe('42101');
    expect(formatCnic('421011234')).toBe('42101-1234');
    expect(formatCnic('4210112345671')).toBe('42101-1234567-1');
    expect(formatCnic('42101-1234567-19999')).toBe('42101-1234567-1');
  });

  it('validates complete numbers only', () => {
    expect(isValidCnic('42101-1234567-1')).toBe(true);
    expect(isValidCnic('4210112345671')).toBe(true);
    expect(isValidCnic('42101-1234567')).toBe(false);
    expect(isValidCnic('42101-12345a7-1')).toBe(false);
  });

  it('masks the middle block', () => {
    expect(maskCnic('4210112345671')).toBe('42101-•••••••-1');
  });
});

describe('distance helpers', () => {
  it('formats metres and kilometres', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(6240)).toBe('6.2 km');
    expect(formatDistance(8000)).toBe('8 km');
    expect(formatDistance(12_400)).toBe('12 km');
    expect(formatDistance(-1)).toBe('—');
  });

  it('maps distance to tone using the PRD radius policy (≤8 km preferred, ≤10 km max)', () => {
    expect(distanceTone(7_900)).toBe('success');
    expect(distanceTone(8_000)).toBe('success');
    expect(distanceTone(9_500)).toBe('warning');
    expect(distanceTone(10_100)).toBe('danger');
    expect(distanceTone(5_000, { preferredMeters: 3_000, maxMeters: 6_000 })).toBe('warning');
  });

  it('bands distance for masked employer views', () => {
    expect(distanceBand(4_999)).toBe('< 5 km');
    expect(distanceBand(7_900)).toBe('5–8 km');
    expect(distanceBand(9_500)).toBe('8–10 km');
    expect(distanceBand(10_100)).toBe('> 10 km');
  });
});

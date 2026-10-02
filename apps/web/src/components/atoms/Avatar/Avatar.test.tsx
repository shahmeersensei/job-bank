import { describe, expect, it } from 'vitest';
import { getInitials } from './Avatar';

describe('getInitials', () => {
  it.each([
    ['Sana Staff (Karachi)', 'SK'],
    ['Muhammad Ahmed Raza', 'MR'],
    ['zainab', 'Z'],
    ['  ', '?'],
    ['(Dr.) Ayesha Khan', 'DK'],
    ['عائشہ خان', 'عخ'],
  ])('%j → %s', (name, initials) => expect(getInitials(name)).toBe(initials));
});

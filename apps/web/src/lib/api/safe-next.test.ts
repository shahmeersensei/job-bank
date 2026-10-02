import { describe, expect, it } from 'vitest';
import { safeNextPath } from './client';

describe('safeNextPath (open-redirect guard)', () => {
  it.each([
    ['/staff', '/staff'],
    ['/staff?tab=jobs', '/staff?tab=jobs'],
    ['//evil.example', null],
    ['/\\evil.example', null],
    ['https://evil.example', null],
    ['staff', null],
    ['', null],
    [null, null],
  ])('%j → %j', (input, expected) => expect(safeNextPath(input)).toBe(expected));
});

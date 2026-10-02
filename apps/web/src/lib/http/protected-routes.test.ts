import { describe, expect, it } from 'vitest';
import { isProtectedPath } from './protected-routes';

describe('isProtectedPath', () => {
  it.each(['/staff', '/staff/jobs/1', '/super-admin', '/applicant/profile'])('protects %s', (p) => {
    expect(isProtectedPath(p)).toBe(true);
  });
  it.each(['/', '/login', '/staffing-agency', '/api/v1/health', '/dev/components'])(
    'leaves %s public',
    (p) => {
      expect(isProtectedPath(p)).toBe(false);
    },
  );
});

import { describe, expect, it } from 'vitest';
import { resolveRadius } from './radius-resolution';

const GLOBAL = { preferredM: 8000, maxM: 10_000 };

describe('radius resolution (job → category → branch → global)', () => {
  it('falls back to the PRD defaults when nothing is configured', () => {
    expect(resolveRadius({})).toEqual({
      preferredM: 8000,
      maxM: 10_000,
      source: 'DEFAULT',
      capped: false,
    });
  });

  it('uses the global policy when no specific one exists', () => {
    expect(resolveRadius({ GLOBAL: { preferredM: 6000, maxM: 9000 } })).toMatchObject({
      preferredM: 6000,
      maxM: 9000,
      source: 'GLOBAL',
    });
  });

  it('prefers branch over global', () => {
    const r = resolveRadius({ GLOBAL, BRANCH: { preferredM: 4000, maxM: 6000 } });
    expect(r).toMatchObject({ preferredM: 4000, maxM: 6000, source: 'BRANCH' });
  });

  it('prefers category over branch', () => {
    const r = resolveRadius({
      GLOBAL,
      BRANCH: { preferredM: 4000, maxM: 6000 },
      CATEGORY: { preferredM: 7000, maxM: 9000 },
    });
    expect(r).toMatchObject({ preferredM: 7000, maxM: 9000, source: 'CATEGORY' });
  });

  it('prefers job over everything', () => {
    const r = resolveRadius({
      GLOBAL,
      BRANCH: { preferredM: 4000, maxM: 6000 },
      CATEGORY: { preferredM: 7000, maxM: 9000 },
      JOB: { preferredM: 2000, maxM: 3000 },
    });
    expect(r).toMatchObject({ preferredM: 2000, maxM: 3000, source: 'JOB' });
  });

  it('skips missing levels (null or undefined)', () => {
    const r = resolveRadius({
      GLOBAL,
      JOB: null,
      CATEGORY: undefined,
      BRANCH: { preferredM: 3000, maxM: 5000 },
    });
    expect(r.source).toBe('BRANCH');
  });

  it('caps a specific policy at the global max (lowering global tightens everything)', () => {
    const r = resolveRadius({
      GLOBAL: { preferredM: 5000, maxM: 7000 },
      BRANCH: { preferredM: 8000, maxM: 9500 },
    });
    expect(r).toEqual({ preferredM: 7000, maxM: 7000, source: 'BRANCH', capped: true });
  });

  it('never exceeds the 10 km hard limit, even with bad data', () => {
    const r = resolveRadius({ GLOBAL: { preferredM: 8000, maxM: 25_000 } });
    expect(r.maxM).toBe(10_000);
    expect(r.capped).toBe(true);
  });
});

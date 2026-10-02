import {
  RADIUS_LIMITS,
  type RadiusScope,
  type RadiusValue,
  type ResolvedRadius,
} from '@jobbank/shared';

/** The policies that could apply to one match: any of them may be missing. */
export type ApplicablePolicies = Partial<Record<RadiusScope, RadiusValue | null>>;

const SPECIFIC_FIRST: readonly RadiusScope[] = ['JOB', 'CATEGORY', 'BRANCH', 'GLOBAL'];

/**
 * PRD rule 4: the most specific policy wins (job → category → branch → global), and the
 * result never exceeds the global max (so lowering the global max tightens everything).
 * Without a global row the PRD defaults (8 km / 10 km) apply.
 */
export function resolveRadius(policies: ApplicablePolicies): ResolvedRadius {
  const global = policies.GLOBAL ?? {
    preferredM: RADIUS_LIMITS.defaultPreferredM,
    maxM: RADIUS_LIMITS.defaultMaxM,
  };
  const scope = SPECIFIC_FIRST.find((s) => policies[s] != null);
  const chosen = scope ? policies[scope]! : global;
  const ceiling = Math.min(global.maxM, RADIUS_LIMITS.maxM);
  const maxM = Math.min(chosen.maxM, ceiling);
  const preferredM = Math.min(chosen.preferredM, maxM);
  return {
    preferredM,
    maxM,
    source: scope ?? 'DEFAULT',
    capped: maxM !== chosen.maxM || preferredM !== chosen.preferredM,
  };
}

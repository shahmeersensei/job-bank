import type { Tone } from '@/design-system/tokens';

/** PRD defaults — the live values come from match_radius_policies (M5/M9). */
export const DEFAULT_PREFERRED_RADIUS_M = 8_000;
export const DEFAULT_MAX_RADIUS_M = 10_000;

export interface RadiusPolicy {
  preferredMeters: number;
  maxMeters: number;
}

const DEFAULT_POLICY: RadiusPolicy = {
  preferredMeters: DEFAULT_PREFERRED_RADIUS_M,
  maxMeters: DEFAULT_MAX_RADIUS_M,
};

/** 850 → "850 m", 6240 → "6.2 km", 12000 → "12 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1_000) return `${Math.round(meters)} m`;
  const km = meters / 1_000;
  return `${km < 10 ? km.toFixed(1).replace(/\.0$/, '') : Math.round(km)} km`;
}

/** success = within preferred radius, warning = allowed up to max, danger = outside max. */
export function distanceTone(meters: number, policy: RadiusPolicy = DEFAULT_POLICY): Tone {
  if (meters <= policy.preferredMeters) return 'success';
  if (meters <= policy.maxMeters) return 'warning';
  return 'danger';
}

/**
 * Coarse band shown to employers instead of an exact distance (PII masking, PRD rule 3).
 * Exact distance + coordinates could help locate an applicant's home.
 */
export function distanceBand(meters: number): string {
  if (meters < 5_000) return '< 5 km';
  if (meters <= 8_000) return '5–8 km';
  if (meters <= 10_000) return '8–10 km';
  return '> 10 km';
}

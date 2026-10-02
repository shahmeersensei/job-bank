import type { RadiusPolicy } from '@/lib/format/distance';

export interface DistanceBadgeProps {
  meters: number;
  /** Radius policy in force for this job (defaults to PRD 8 km / 10 km). */
  policy?: RadiusPolicy;
  /** Employer-facing views must pass `masked` — shows a coarse band, never the exact distance. */
  masked?: boolean;
  className?: string;
}

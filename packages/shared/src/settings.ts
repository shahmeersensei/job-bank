import { z } from 'zod';

/**
 * System settings (M5). Each key has one zod schema, a default and its bounds. The
 * database stores JSON values, and every read and write goes through these schemas.
 * Matching radius is NOT here: it lives in match_radius_policies (see RADIUS_LIMITS).
 */
const strictlyIncreasing = (days: number[]) => days.every((d, i) => i === 0 || d > days[i - 1]!);

export const SETTING_DEFINITIONS = {
  'matching.hold_expiry_days': {
    label: 'Hold expiry',
    description: 'Days an employer "Hold" lasts before the candidate is released.',
    unit: 'days',
    schema: z.number().int().min(1).max(90),
    default: 14,
  },
  'decision.counteroffer_max_rounds': {
    label: 'Counteroffer rounds',
    description: 'Maximum counteroffers per match case before a final answer is required.',
    unit: 'rounds',
    schema: z.number().int().min(1).max(10),
    default: 3,
  },
  'placement.followup_days': {
    label: 'Follow-up schedule',
    description: 'Days after joining when staff check in with the placed applicant.',
    unit: 'days after joining',
    schema: z
      .array(z.number().int().min(1).max(730))
      .min(1)
      .max(10)
      .refine(strictlyIncreasing, 'List the days in increasing order, without repeats'),
    default: [7, 30, 90, 180],
  },
  'verification.sla_working_days': {
    label: 'Verification SLA',
    description: 'Working days a verifier has to decide on a company submission.',
    unit: 'working days',
    schema: z.number().int().min(1).max(30),
    default: 2,
  },
  'calendar.weekend_days': {
    label: 'Weekly days off',
    description: 'Non-working weekdays for SLA calculations (0 = Sunday … 6 = Saturday).',
    unit: 'weekdays',
    schema: z
      .array(z.number().int().min(0).max(6))
      .max(6)
      .refine((days) => new Set(days).size === days.length, 'Each weekday only once'),
    default: [0],
  },
  'jobs.review_required': {
    label: 'Staff review for new jobs',
    description: 'When on, jobs from verified companies wait for staff approval before going live.',
    unit: null,
    schema: z.boolean(),
    default: false,
  },
} as const satisfies Record<
  string,
  { label: string; description: string; unit: string | null; schema: z.ZodType; default: unknown }
>;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_DEFINITIONS)[K]['schema']>;
export type SettingValues = { [K in SettingKey]: SettingValue<K> };

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

export const settingKeySchema = z.enum(SETTING_KEYS as [SettingKey, ...SettingKey[]]);

export function isSettingKey(key: string): key is SettingKey {
  return Object.hasOwn(SETTING_DEFINITIONS, key);
}

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// ─── Matching radius (match_radius_policies) ─────────────────────────

/** PRD: the max radius never exceeds 10 km — a hard database CHECK, with no override. */
export const RADIUS_LIMITS = {
  minM: 500,
  maxM: 10_000,
  defaultPreferredM: 8_000,
  defaultMaxM: 10_000,
} as const;

export const RADIUS_SCOPES = ['GLOBAL', 'BRANCH', 'CATEGORY', 'JOB'] as const;
export type RadiusScope = (typeof RADIUS_SCOPES)[number];

const meters = z
  .number('Enter a distance')
  .int('Use whole metres')
  .min(RADIUS_LIMITS.minM, `Must be at least ${RADIUS_LIMITS.minM / 1000} km`)
  .max(RADIUS_LIMITS.maxM, `Cannot be more than ${RADIUS_LIMITS.maxM / 1000} km`);

export const radiusValueSchema = z
  .strictObject({ preferredM: meters, maxM: meters })
  .refine((r) => r.preferredM <= r.maxM, {
    message: 'Preferred radius cannot be larger than the maximum',
    path: ['preferredM'],
  });

export type RadiusValue = z.infer<typeof radiusValueSchema>;

export interface ResolvedRadius extends RadiusValue {
  /** Which policy supplied the value (most specific wins). */
  source: RadiusScope | 'DEFAULT';
  /** True when the chosen policy was larger than the global max and got capped. */
  capped: boolean;
}

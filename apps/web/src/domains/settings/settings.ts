import 'server-only';
import { schema } from '@jobbank/db';
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  isSettingKey,
  type SettingKey,
  type SettingValue,
  type SettingValues,
} from '@jobbank/shared';
import { and, eq, isNull, or } from 'drizzle-orm';
import { runCommand, type RequestContext } from '@/domains/shared/audit';
import { ForbiddenError, ValidationError, zodIssues } from '@/domains/shared/errors';
import { assertPermission, isSuperAdmin, type Actor } from '@/domains/shared/scope';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { activeHolidayDates } from './master-data';
import type { WorkingCalendar } from './working-days';

type SignedIn = RequestContext & { actor: Actor };

const s = schema.systemSettings;

export interface SettingView<K extends SettingKey = SettingKey> {
  key: K;
  label: string;
  description: string;
  unit: string | null;
  value: SettingValue<K>;
  defaultValue: SettingValue<K>;
  isDefault: boolean;
  updatedAt: Date | null;
}

/**
 * A stored value that no longer fits its schema (e.g. bounds tightened in code) must not
 * break the app: fall back to the default and log it so someone fixes the row.
 */
function parseStored<K extends SettingKey>(key: K, raw: unknown): SettingValue<K> | undefined {
  const result = SETTING_DEFINITIONS[key].schema.safeParse(raw);
  if (result.success) return result.data as SettingValue<K>;
  logger.warn('stored setting is invalid; using the default', { key });
  return undefined;
}

const defaultOf = <K extends SettingKey>(key: K) =>
  structuredClone(SETTING_DEFINITIONS[key].default) as SettingValue<K>;

/**
 * One setting: the branch's own value, else the global value, else the default.
 * (No key is branch-overridable yet — owner decision 2026-10-02 — but reads already honour
 * branch rows so later overrides need no new read path.)
 */
export async function getSetting<K extends SettingKey>(
  key: K,
  options: { branchId?: string | null } = {},
): Promise<SettingValue<K>> {
  const rows = await db
    .select({ branchId: s.branchId, value: s.value })
    .from(s)
    .where(
      and(
        eq(s.key, key),
        options.branchId
          ? or(isNull(s.branchId), eq(s.branchId, options.branchId))
          : isNull(s.branchId),
      ),
    );
  const branch = rows.find((r) => r.branchId !== null);
  const global = rows.find((r) => r.branchId === null);
  return (
    (branch && parseStored(key, branch.value)) ??
    (global && parseStored(key, global.value)) ??
    defaultOf(key)
  );
}

/** Every global setting with its metadata (Settings page). */
export async function listSettings(): Promise<SettingView[]> {
  const rows = await db
    .select({ key: s.key, value: s.value, updatedAt: s.updatedAt })
    .from(s)
    .where(isNull(s.branchId));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return SETTING_KEYS.map((key) => {
    const def = SETTING_DEFINITIONS[key];
    const row = byKey.get(key);
    const stored = row ? parseStored(key, row.value) : undefined;
    return {
      key,
      label: def.label,
      description: def.description,
      unit: def.unit,
      value: stored ?? defaultOf(key),
      defaultValue: defaultOf(key),
      isDefault: stored === undefined || JSON.stringify(stored) === JSON.stringify(def.default),
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function getGlobalSettings(): Promise<SettingValues> {
  const views = await listSettings();
  return Object.fromEntries(views.map((v) => [v.key, v.value])) as SettingValues;
}

/** Super Admin changes a global setting. Every change is audited with before/after. */
export async function updateGlobalSetting(
  ctx: SignedIn,
  key: string,
  value: unknown,
): Promise<SettingView> {
  assertPermission(ctx.actor, 'settings:manage');
  if (!isSuperAdmin(ctx.actor))
    throw new ForbiddenError('Only Super Admin changes global settings');
  if (!isSettingKey(key)) {
    throw new ValidationError([{ path: 'key', message: `Unknown setting "${key}"` }]);
  }
  const parsed = SETTING_DEFINITIONS[key].schema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(
      zodIssues(parsed.error).map((issue) => ({
        ...issue,
        path: issue.path === '(root)' ? 'value' : `value.${issue.path}`,
      })),
    );
  }

  await runCommand(ctx, async ({ tx, audit }) => {
    const [before] = await tx
      .select({ value: s.value })
      .from(s)
      .where(and(eq(s.key, key), isNull(s.branchId)));
    await tx
      .insert(s)
      .values({ key, branchId: null, value: parsed.data, updatedBy: ctx.actor.userId })
      .onConflictDoUpdate({
        target: [s.key, s.branchId],
        set: { value: parsed.data, updatedBy: ctx.actor.userId },
      });
    audit({
      action: 'setting.update',
      entityType: 'setting',
      entityId: key,
      before: { value: before?.value ?? SETTING_DEFINITIONS[key].default },
      after: { value: parsed.data },
    });
  });
  return (await listSettings()).find((v) => v.key === key)!;
}

/** Weekly days off (setting) + active holidays (table), for SLA due dates. */
export async function getWorkingCalendar(): Promise<WorkingCalendar> {
  const [weekendDays, holidays] = await Promise.all([
    getSetting('calendar.weekend_days'),
    activeHolidayDates(),
  ]);
  return { weekendDays, holidays };
}

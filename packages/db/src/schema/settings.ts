import { MASTER_DATA_TYPES, RADIUS_LIMITS, RADIUS_SCOPES } from '@jobbank/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { users } from './identity';

const typeList = sql.raw(MASTER_DATA_TYPES.map((t) => `'${t}'`).join(', '));

/**
 * M5: reference lists (categories, skills, cities, reason codes, …) in one table. Other
 * tables store the permanent `code`; items are deactivated, never deleted. `meta` is
 * validated per type in code (MASTER_DATA_META in @jobbank/shared).
 */
export const masterData = pgTable(
  'master_data',
  {
    id: uuid().primaryKey().defaultRandom(),
    type: text({ enum: MASTER_DATA_TYPES }).notNull(),
    code: text().notNull(),
    label: text().notNull(),
    description: text(),
    /** Area → city, skill → job category. */
    parentId: uuid().references((): AnyPgColumn => masterData.id, { onDelete: 'restrict' }),
    meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('master_data_type_code_uq').on(t.type, t.code),
    index('master_data_type_idx').on(t.type, t.isActive, t.sortOrder),
    index('master_data_parent_idx').on(t.parentId),
    check('master_data_type_valid', sql`${t.type} in (${typeList})`),
    check('master_data_code_format', sql`${t.code} ~ '^[A-Z0-9]+(_[A-Z0-9]+)*$'`),
    check('master_data_meta_object', sql`jsonb_typeof(${t.meta}) = 'object'`),
  ],
);

/** Public holidays, used for working-day SLAs (verification ≤ 2 working days). */
export const holidays = pgTable('holidays', {
  id: uuid().primaryKey().defaultRandom(),
  date: date({ mode: 'string' }).notNull().unique(),
  name: text().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Typed settings (SETTING_DEFINITIONS in @jobbank/shared). `branch_id` NULL = global value;
 * a branch row overrides it for that branch. A missing row means "use the default".
 */
export const systemSettings = pgTable(
  'system_settings',
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text().notNull(),
    branchId: uuid().references(() => branches.id, { onDelete: 'cascade' }),
    value: jsonb().notNull(),
    updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('system_settings_key_branch_uq').on(t.key, t.branchId).nullsNotDistinct()],
);

/**
 * PRD rule 4: matching radius. The most specific policy wins (job → category → branch →
 * global) and is capped by the global max. The 10 km ceiling is a CHECK with no override.
 * JOB scope gets its `job_id` column in M8, when the jobs table exists.
 */
export const matchRadiusPolicies = pgTable(
  'match_radius_policies',
  {
    id: uuid().primaryKey().defaultRandom(),
    scope: text({ enum: RADIUS_SCOPES }).notNull(),
    branchId: uuid().references(() => branches.id, { onDelete: 'cascade' }),
    categoryId: uuid().references(() => masterData.id, { onDelete: 'cascade' }),
    preferredM: integer().notNull(),
    maxM: integer().notNull(),
    updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('match_radius_policies_global_uq')
      .on(t.scope)
      .where(sql`${t.scope} = 'GLOBAL'`),
    uniqueIndex('match_radius_policies_branch_uq')
      .on(t.branchId)
      .where(sql`${t.branchId} is not null`),
    uniqueIndex('match_radius_policies_category_uq')
      .on(t.categoryId)
      .where(sql`${t.categoryId} is not null`),
    check(
      'match_radius_policies_scope_ref',
      sql`(${t.scope} = 'GLOBAL' and ${t.branchId} is null and ${t.categoryId} is null)
       or (${t.scope} = 'BRANCH' and ${t.branchId} is not null and ${t.categoryId} is null)
       or (${t.scope} = 'CATEGORY' and ${t.categoryId} is not null and ${t.branchId} is null)`,
    ),
    check(
      'match_radius_policies_range',
      sql`${t.preferredM} >= ${sql.raw(String(RADIUS_LIMITS.minM))} and ${t.preferredM} <= ${t.maxM} and ${t.maxM} <= ${sql.raw(String(RADIUS_LIMITS.maxM))}`,
    ),
  ],
);

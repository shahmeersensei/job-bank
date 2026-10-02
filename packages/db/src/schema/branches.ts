import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { geographyPoint } from '../types/geography';

/**
 * PRD rule 1: multi-branch from day one. Created in M3 because role assignments are
 * branch-scoped; branch management (CRUD, UI) arrives in M4.
 */
export const branches = pgTable(
  'branches',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Short stable code, e.g. "KHI-GULSHAN" (used in candidate codes like JB-KHI-00412). */
    code: text().notNull().unique(),
    name: text().notNull(),
    city: text().notNull(),
    address: text(),
    location: geographyPoint(),
    // The matching radius lives in match_radius_policies (BRANCH scope) since M5.
    phone: text(),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('branches_code_format', sql`${t.code} ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'`)],
);

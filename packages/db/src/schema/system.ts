import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * PRD §7.2: every sensitive action writes here. Append-only — the migration calls
 * jobbank_make_append_only('audit_logs') (trigger + revoked UPDATE/DELETE for app_rw).
 * No foreign keys on purpose: audit rows must outlive the users/entities they mention.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid(),
    actorRole: text(),
    branchId: uuid(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text(),
    before: jsonb(),
    after: jsonb(),
    reason: text(),
    metadata: jsonb(),
    ip: text(),
    userAgent: text(),
    correlationId: text(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entityType, t.entityId, t.occurredAt),
    index('audit_logs_branch_idx').on(t.branchId, t.occurredAt),
    index('audit_logs_actor_idx').on(t.actorUserId, t.occurredAt),
    index('audit_logs_action_idx').on(t.action, t.occurredAt),
  ],
);

/**
 * PRD §8: idempotency keys on write operations. A retried request with the same key
 * replays the stored response instead of performing the write twice.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    /** Who owns the key: a user id, or "anonymous" for public endpoints. */
    scope: text().notNull(),
    key: text().notNull(),
    route: text().notNull(),
    requestHash: text().notNull(),
    status: text({ enum: ['in_progress', 'completed'] })
      .notNull()
      .default('in_progress'),
    responseStatus: integer(),
    responseBody: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '24 hours'`),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.key] }),
    index('idempotency_keys_expires_idx').on(t.expiresAt),
  ],
);

import { schema } from '@jobbank/db';
import { db, type DbExecutor, type Transaction } from '@/lib/db';
import { redactPii } from '@/lib/privacy/redact';
import {
  dispatchEvents,
  type DomainEvent,
  type DomainEventMap,
  type DomainEventName,
} from '../events';
import type { RequestContext } from './context';

export interface AuditEntry {
  /** Verb in dot notation, e.g. "company.verify", "match_case.refer", "auth.login_failed". */
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  /** State before/after the change. PII is redacted automatically before storage. */
  before?: unknown;
  after?: unknown;
  /** Required by some flows (withdrawals, overrides, proxy decisions). */
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

function toRow(ctx: RequestContext, entry: AuditEntry): typeof schema.auditLogs.$inferInsert {
  return {
    actorUserId: ctx.actor?.userId ?? null,
    actorRole: ctx.system ? 'SYSTEM' : (ctx.actor?.roles.join(',') ?? 'ANONYMOUS'),
    branchId: entry.branchId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before === undefined ? null : redactPii(entry.before),
    after: entry.after === undefined ? null : redactPii(entry.after),
    reason: entry.reason ?? null,
    metadata: entry.metadata ? redactPii(entry.metadata) : null,
    ip: ctx.ip,
    userAgent: ctx.userAgent?.slice(0, 512) ?? null,
    correlationId: ctx.correlationId,
  };
}

/**
 * Writes audit rows outside any business transaction — for events that must be kept even
 * though nothing changed (failed logins, denied cross-branch access, document views).
 */
export async function recordAudit(
  ctx: RequestContext,
  entries: AuditEntry | AuditEntry[],
  executor: DbExecutor = db,
): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (list.length === 0) return;
  await executor.insert(schema.auditLogs).values(list.map((entry) => toRow(ctx, entry)));
}

export interface CommandScope {
  tx: Transaction;
  ctx: RequestContext;
  /** Queue an audit row; written in the same transaction as the change. */
  audit(entry: AuditEntry): void;
  /** Queue a domain event; dispatched only after the transaction commits. */
  emit<N extends DomainEventName>(name: N, payload: DomainEventMap[N]): void;
}

export class MissingAuditError extends Error {
  constructor() {
    super('Command finished without recording an audit entry (PRD: 100% audit completeness)');
    this.name = 'MissingAuditError';
  }
}

/**
 * Runs a state-changing use case atomically: business writes + audit rows commit together
 * or not at all. By default at least one audit entry is required — pass `{ audited: false }`
 * only for genuinely non-sensitive writes.
 */
export async function runCommand<T>(
  ctx: RequestContext,
  fn: (scope: CommandScope) => Promise<T>,
  options: { audited?: boolean } = {},
): Promise<T> {
  const audited = options.audited ?? true;
  const events: DomainEvent[] = [];

  const result = await db.transaction(async (tx) => {
    const entries: AuditEntry[] = [];
    const value = await fn({
      tx,
      ctx,
      audit: (entry) => entries.push(entry),
      emit: (name, payload) =>
        events.push({
          name,
          payload,
          occurredAt: new Date(),
          correlationId: ctx.correlationId,
        } as DomainEvent),
    });
    if (audited && entries.length === 0) throw new MissingAuditError();
    await recordAudit(ctx, entries, tx);
    return value;
  });

  await dispatchEvents(events, ctx.log);
  return result;
}

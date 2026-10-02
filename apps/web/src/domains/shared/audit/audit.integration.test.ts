import { schema } from '@jobbank/db';
import { eq, sql } from 'drizzle-orm';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { clearEventHandlers, onEvent } from '../events';
import type { Actor } from '../scope';
import { makeActor } from '@/test/factories';
import { MissingAuditError, recordAudit, runCommand } from './audit';
import { systemContext, type RequestContext } from './context';

declare module '@/domains/shared/events' {
  interface DomainEventMap {
    'probe.created': { id: string };
  }
}

// A throwaway business table, created by the owner role like real migrations do.
const probes = pgTable('m2_command_probe', {
  id: uuid().primaryKey(),
  name: text().notNull(),
  cnic: text(),
});
const owner = postgres(process.env.TEST_DATABASE_MIGRATOR_URL!, { max: 1, onnotice: () => {} });

const actor: Actor = makeActor({
  userId: '44444444-4444-4444-8444-444444444444',
  roles: ['STAFF'],
  branchIds: ['55555555-5555-4555-8555-555555555555'],
});

function context(): RequestContext {
  const correlationId = `it-${crypto.randomUUID()}`;
  return {
    actor,
    system: false,
    correlationId,
    ip: '10.1.2.3',
    userAgent: 'vitest',
    log: createLogger({ correlationId }),
  };
}

const auditRows = (correlationId: string) =>
  db.select().from(schema.auditLogs).where(eq(schema.auditLogs.correlationId, correlationId));

beforeAll(async () => {
  await owner`CREATE TABLE IF NOT EXISTS m2_command_probe (id uuid PRIMARY KEY, name text NOT NULL, cnic text)`;
});
beforeEach(() => clearEventHandlers());
afterAll(async () => {
  await owner`DROP TABLE IF EXISTS m2_command_probe`;
  await owner.end();
});

describe('runCommand', () => {
  it('commits the change and its audit row together, with PII redacted', async () => {
    const ctx = context();
    const id = crypto.randomUUID();
    await runCommand(ctx, async ({ tx, audit }) => {
      await tx.insert(probes).values({ id, name: 'Ayesha', cnic: '4210112345671' });
      audit({
        action: 'probe.create',
        entityType: 'probe',
        entityId: id,
        branchId: actor.branchIds[0],
        after: { id, name: 'Ayesha', cnic: '4210112345671' },
      });
    });

    expect(await db.select().from(probes).where(eq(probes.id, id))).toHaveLength(1);
    const [row] = await auditRows(ctx.correlationId);
    expect(row).toMatchObject({
      action: 'probe.create',
      entityId: id,
      actorUserId: actor.userId,
      actorRole: 'STAFF',
      ip: '10.1.2.3',
      after: { id, name: 'Ayesha', cnic: '[REDACTED]' },
    });
  });

  it('rolls back the change AND the audit row when the use case fails', async () => {
    const ctx = context();
    const id = crypto.randomUUID();
    await expect(
      runCommand(ctx, async ({ tx, audit }) => {
        await tx.insert(probes).values({ id, name: 'Bilal' });
        audit({ action: 'probe.create', entityType: 'probe', entityId: id });
        throw new Error('guard failed after write');
      }),
    ).rejects.toThrow('guard failed after write');

    expect(await db.select().from(probes).where(eq(probes.id, id))).toHaveLength(0);
    expect(await auditRows(ctx.correlationId)).toHaveLength(0);
  });

  it('refuses to commit a sensitive command that recorded no audit entry', async () => {
    const ctx = context();
    const id = crypto.randomUUID();
    await expect(
      runCommand(ctx, async ({ tx }) => {
        await tx.insert(probes).values({ id, name: 'Sana' });
      }),
    ).rejects.toThrow(MissingAuditError);
    expect(await db.select().from(probes).where(eq(probes.id, id))).toHaveLength(0);
  });

  it('dispatches events only after commit, and never for rolled-back commands', async () => {
    const delivered: string[] = [];
    onEvent('probe.created', async (event) => {
      // The row must already be visible outside the transaction.
      const rows = await db.select().from(probes).where(eq(probes.id, event.payload.id));
      delivered.push(`${event.payload.id}:${rows.length}`);
    });

    const ok = crypto.randomUUID();
    await runCommand(context(), async ({ tx, audit, emit }) => {
      await tx.insert(probes).values({ id: ok, name: 'Ok' });
      audit({ action: 'probe.create', entityType: 'probe', entityId: ok });
      emit('probe.created', { id: ok });
    });

    const failed = crypto.randomUUID();
    await runCommand(context(), async ({ tx, audit, emit }) => {
      await tx.insert(probes).values({ id: failed, name: 'Nope' });
      audit({ action: 'probe.create', entityType: 'probe', entityId: failed });
      emit('probe.created', { id: failed });
      throw new Error('boom');
    }).catch(() => {});

    expect(delivered).toEqual([`${ok}:1`]);
  });
});

describe('audit trail immutability (PRD rule 8)', () => {
  it('lets standalone audit rows be written, but never changed or deleted by the app', async () => {
    const ctx = systemContext('hold-expiry');
    await recordAudit(ctx, {
      action: 'auth.login_failed',
      entityType: 'user',
      metadata: { phone: '+923001234567', attempts: 3 },
    });
    const [row] = await auditRows(ctx.correlationId);
    expect(row).toMatchObject({
      actorRole: 'SYSTEM',
      actorUserId: null,
      metadata: { phone: '[REDACTED]', attempts: 3 },
    });

    await expect(
      db.execute(sql`UPDATE audit_logs SET action = 'tampered' WHERE id = ${row!.id}`),
    ).rejects.toMatchObject({
      cause: { code: '42501' },
    });
    await expect(
      db.delete(schema.auditLogs).where(eq(schema.auditLogs.id, row!.id)),
    ).rejects.toMatchObject({
      cause: { code: '42501' },
    });
    // Even the owner is stopped by the trigger.
    await expect(owner`DELETE FROM audit_logs WHERE id = ${row!.id}`).rejects.toMatchObject({
      code: 'JB001',
    });
  });
});

import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { recordAudit, type RequestContext } from '@/domains/shared/audit';
import { NotFoundError, ScopeViolationError } from '@/domains/shared/errors';
import type { Actor } from '@/domains/shared/scope';
import { resolveCorrelationId } from '@/lib/http/correlation';
import { logger } from '@/lib/logger';

/** RequestContext for server components (same shape the API layer builds). */
export async function pageContext(actor: Actor): Promise<RequestContext & { actor: Actor }> {
  const h = await headers();
  const correlationId = resolveCorrelationId(h.get('x-correlation-id'));
  return {
    actor,
    system: false,
    correlationId,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: h.get('user-agent'),
    log: logger.child({ correlationId, actorId: actor.userId }),
  };
}

/**
 * Runs a page's data load with the same rules as the API: out-of-scope records are audited
 * and shown as "forbidden", missing records as 404.
 */
export async function loadForPage<T>(actor: Actor, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ScopeViolationError) {
      const ctx = await pageContext(actor);
      await recordAudit(ctx, {
        action: 'access.scope_violation',
        entityType: error.target?.entityType ?? 'unknown',
        entityId: error.target?.entityId ?? null,
        branchId: error.target?.branchId ?? null,
        metadata: { via: 'page' },
      });
      redirect('/forbidden');
    }
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

import { logger, type Logger } from '@/lib/logger';
import type { Actor } from '../scope';

/** Everything a domain operation needs to know about who/what/where is calling. */
export interface RequestContext {
  /** null for anonymous requests and scheduled jobs. */
  actor: Actor | null;
  /** True for scheduled jobs and internal automation. */
  system: boolean;
  correlationId: string;
  ip: string | null;
  userAgent: string | null;
  log: Logger;
}

export function systemContext(
  job: string,
  correlationId: string = crypto.randomUUID(),
): RequestContext {
  return {
    actor: null,
    system: true,
    correlationId,
    ip: null,
    userAgent: `system:${job}`,
    log: logger.child({ correlationId, job }),
  };
}

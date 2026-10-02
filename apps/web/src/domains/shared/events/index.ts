import { logger as rootLogger, type Logger } from '@/lib/logger';

/**
 * Registry of domain events. Each domain adds its own via declaration merging
 * (this file must stay the module's single entry point for merging to work):
 *
 *   declare module '@/domains/shared/events' {
 *     interface DomainEventMap { 'company.verified': { companyId: string; branchId: string } }
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DomainEventMap {}

export type DomainEventName = keyof DomainEventMap & string;

export interface DomainEvent<N extends DomainEventName = DomainEventName> {
  name: N;
  payload: DomainEventMap[N];
  occurredAt: Date;
  correlationId: string;
}

type Handler<N extends DomainEventName> = (event: DomainEvent<N>) => void | Promise<void>;

const handlers = new Map<string, Set<Handler<DomainEventName>>>();

/** Subscribe to an event (notifications, projections…). Returns an unsubscribe function. */
export function onEvent<N extends DomainEventName>(name: N, handler: Handler<N>): () => void {
  const set = handlers.get(name) ?? new Set();
  set.add(handler as Handler<DomainEventName>);
  handlers.set(name, set);
  return () => set.delete(handler as Handler<DomainEventName>);
}

/**
 * Delivers events to subscribers, in order. Called only AFTER the transaction commits.
 * A failing subscriber is logged and never undoes the committed business change.
 * (Phase 4 replaces this with a durable queue/outbox.)
 */
export async function dispatchEvents(
  events: readonly DomainEvent[],
  log: Logger = rootLogger,
): Promise<void> {
  for (const event of events) {
    for (const handler of handlers.get(event.name) ?? []) {
      try {
        await handler(event);
      } catch (err) {
        log.error('domain event handler failed', {
          event: event.name,
          correlationId: event.correlationId,
          err,
        });
      }
    }
  }
}

/** Test helper: remove all subscriptions. */
export function clearEventHandlers(): void {
  handlers.clear();
}

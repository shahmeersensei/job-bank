import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '@/lib/logger';
import { clearEventHandlers, dispatchEvents, onEvent, type DomainEvent } from '.';

declare module '.' {
  interface DomainEventMap {
    'test.happened': { id: string };
  }
}

const event = (id: string): DomainEvent<'test.happened'> => ({
  name: 'test.happened',
  payload: { id },
  occurredAt: new Date(),
  correlationId: 'corr-test-1',
});

afterEach(() => clearEventHandlers());

describe('domain events', () => {
  it('delivers events in order to every subscriber', async () => {
    const seen: string[] = [];
    onEvent('test.happened', (e) => void seen.push(`a:${e.payload.id}`));
    onEvent('test.happened', async (e) => void seen.push(`b:${e.payload.id}`));
    await dispatchEvents([event('1'), event('2')]);
    expect(seen).toEqual(['a:1', 'b:1', 'a:2', 'b:2']);
  });

  it('logs a failing subscriber without stopping the others', async () => {
    const log = createLogger();
    const errorSpy = vi.spyOn(log, 'error');
    const ok = vi.fn();
    onEvent('test.happened', () => {
      throw new Error('sms gateway down');
    });
    onEvent('test.happened', ok);
    await dispatchEvents([event('1')], log);
    expect(ok).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      'domain event handler failed',
      expect.objectContaining({ event: 'test.happened' }),
    );
  });

  it('supports unsubscribing', async () => {
    const handler = vi.fn();
    const off = onEvent('test.happened', handler);
    off();
    await dispatchEvents([event('1')]);
    expect(handler).not.toHaveBeenCalled();
  });
});

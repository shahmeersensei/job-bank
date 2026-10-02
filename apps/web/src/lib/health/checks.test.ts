import { healthResponseSchema } from '@jobbank/shared';
import { describe, expect, it } from 'vitest';
import { runHealthChecks } from './checks';

const fixedNow = () => new Date('2026-10-01T00:00:00.000Z');

describe('runHealthChecks', () => {
  it('reports ok when every enabled dependency is up', async () => {
    const result = await runHealthChecks(
      {
        database: async () => {},
        postgis: async () => '3.4.3',
        storage: async () => {},
        redis: null,
      },
      { version: '1.0.0', now: fixedNow },
    );

    expect(healthResponseSchema.parse(result)).toEqual(result);
    expect(result.status).toBe('ok');
    expect(result.dependencies.postgis).toMatchObject({ status: 'up', detail: '3.4.3' });
    expect(result.dependencies.redis).toEqual({ status: 'disabled' });
  });

  it('reports degraded and hides errors when asked', async () => {
    const result = await runHealthChecks(
      {
        database: async () => {
          throw new Error('connection refused at db.internal:5432');
        },
        postgis: async () => {},
        storage: async () => {},
        redis: async () => {},
      },
      { version: '1.0.0', exposeErrors: false, now: fixedNow },
    );

    expect(result.status).toBe('degraded');
    expect(result.dependencies.database.status).toBe('down');
    expect(result.dependencies.database.detail).toBeUndefined();
  });

  it('marks a hanging dependency as down after the timeout', async () => {
    const result = await runHealthChecks(
      {
        database: () => new Promise(() => {}),
        postgis: async () => {},
        storage: async () => {},
        redis: null,
      },
      { version: '1.0.0', timeoutMs: 20, now: fixedNow },
    );

    expect(result.dependencies.database).toMatchObject({
      status: 'down',
      detail: 'timed out after 20ms',
    });
  });
});

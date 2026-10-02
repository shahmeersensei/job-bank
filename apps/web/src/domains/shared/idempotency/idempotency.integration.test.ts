import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { z } from 'zod';
import { apiHandler, handlerDeps } from '../http/handler';
import { created } from '../http/responses';
import { postgresIdempotencyStore as store } from './idempotency';

vi.mock('../http/actor', async () => {
  const { makeActor } = await import('@/test/factories');
  return {
    resolveActor: vi.fn(async () =>
      makeActor({
        userId: '66666666-6666-4666-8666-666666666666',
        roles: ['EMPLOYER'],
        companyId: 'c-1',
      }),
    ),
  };
});

const owner = postgres(process.env.TEST_DATABASE_MIGRATOR_URL!, { max: 1, onnotice: () => {} });
const fresh = () => `it-${crypto.randomUUID()}`;

beforeEach(() => {
  handlerDeps.idempotencyStore = store;
});
afterAll(() => owner.end());

describe('postgres idempotency store', () => {
  it('claims, blocks concurrent duplicates, replays and detects mismatches', async () => {
    const key = fresh();
    expect(await store.begin('u1', key, 'POST /a', 'h')).toEqual({ state: 'new' });
    expect(await store.begin('u1', key, 'POST /a', 'h')).toEqual({ state: 'in_progress' });
    await store.complete('u1', key, 201, { data: { id: 1 } });
    expect(await store.begin('u1', key, 'POST /a', 'h')).toEqual({
      state: 'replay',
      status: 201,
      body: { data: { id: 1 } },
    });
    expect(await store.begin('u1', key, 'POST /a', 'other')).toEqual({ state: 'mismatch' });
    expect(await store.begin('u2', key, 'POST /a', 'other')).toEqual({ state: 'new' });
  });

  it('only one of many simultaneous requests wins the key', async () => {
    const key = fresh();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => store.begin('u1', key, 'POST /a', 'h')),
    );
    expect(results.filter((r) => r.state === 'new')).toHaveLength(1);
    expect(results.filter((r) => r.state === 'in_progress')).toHaveLength(7);
  });

  it('reclaims abandoned in-progress keys and expired keys', async () => {
    const stale = fresh();
    await store.begin('u1', stale, 'POST /a', 'h');
    await owner`UPDATE idempotency_keys SET created_at = now() - interval '5 minutes' WHERE key = ${stale}`;
    expect(await store.begin('u1', stale, 'POST /a', 'h')).toEqual({ state: 'new' });

    const expired = fresh();
    await store.begin('u1', expired, 'POST /a', 'h');
    await store.complete('u1', expired, 200, null);
    await owner`UPDATE idempotency_keys SET expires_at = now() - interval '1 minute' WHERE key = ${expired}`;
    expect(await store.begin('u1', expired, 'POST /a', 'different-now')).toEqual({ state: 'new' });
  });
});

describe('apiHandler + postgres idempotency end to end', () => {
  it('a retried POST creates the record once and returns the same response', async () => {
    let creations = 0;
    const route = apiHandler({
      idempotent: true,
      body: z.object({ title: z.string() }),
      handler: async ({ body }) => created({ id: `job-${++creations}`, title: body.title }),
    });
    const send = () =>
      route(
        new Request('http://localhost/api/v1/jobs', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': key },
          body: JSON.stringify({ title: 'Electrician' }),
        }),
        { params: Promise.resolve({}) },
      );
    const key = fresh();
    const first = await send();
    const second = await send();
    expect(await first.json()).toEqual({ data: { id: 'job-1', title: 'Electrician' } });
    expect(await second.json()).toEqual({ data: { id: 'job-1', title: 'Electrician' } });
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    expect(creations).toBe(1);
  });
});

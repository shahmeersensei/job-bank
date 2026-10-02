import { apiErrorSchema } from '@jobbank/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ConflictError } from '../errors';
import { createMemoryIdempotencyStore } from '../idempotency';
import type { Actor } from '../scope';
import { makeActor } from '@/test/factories';
import { resolveActor } from './actor';
import { apiHandler, handlerDeps } from './handler';
import { created, ok } from './responses';

vi.mock('./actor', () => ({ resolveActor: vi.fn() }));
const mockedActor = vi.mocked(resolveActor);

const staff: Actor = makeActor({
  userId: '11111111-1111-4111-8111-111111111111',
  roles: ['STAFF'],
  branchIds: ['b-1'],
});

const noParams = { params: Promise.resolve({}) };

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/v1/things', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function read(res: Response) {
  return {
    status: res.status,
    headers: res.headers,
    body: res.status === 204 ? null : await res.json(),
  };
}

beforeEach(() => {
  mockedActor.mockResolvedValue(staff);
  handlerDeps.idempotencyStore = createMemoryIdempotencyStore();
});

describe('apiHandler — auth and roles', () => {
  const route = apiHandler({
    roles: ['STAFF', 'BRANCH_ADMIN'],
    handler: async () => ok({ hello: 'world' }),
  });

  it('returns the data envelope and echoes the correlation id', async () => {
    const res = await read(
      await route(
        new Request('http://localhost/x', { headers: { 'x-correlation-id': 'test-corr-001' } }),
        noParams,
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { hello: 'world' } });
    expect(res.headers.get('x-correlation-id')).toBe('test-corr-001');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('401s anonymous requests by default', async () => {
    mockedActor.mockResolvedValue(null);
    const res = await read(await route(new Request('http://localhost/x'), noParams));
    expect(res.status).toBe(401);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.correlation_id).toBe(res.headers.get('x-correlation-id'));
  });

  it('403s actors without an allowed role', async () => {
    mockedActor.mockResolvedValue(makeActor({ roles: ['APPLICANT'] }));
    expect((await route(new Request('http://localhost/x'), noParams)).status).toBe(403);
  });

  it('lets public routes through without an actor', async () => {
    mockedActor.mockResolvedValue(null);
    const open = apiHandler({
      auth: 'public',
      handler: async ({ actor }) => ok({ signedIn: actor !== null }),
    });
    expect((await read(await open(new Request('http://localhost/x'), noParams))).body).toEqual({
      data: { signedIn: false },
    });
  });
});

describe('apiHandler — raw responses', () => {
  it('adds correlation id and no-store to raw responses unless the route sets caching', async () => {
    const raw = apiHandler({
      auth: 'public',
      handler: async () => Response.json({ status: 'ok' }, { status: 503 }),
    });
    const res = await raw(
      new Request('http://localhost/x', { headers: { 'x-correlation-id': 'raw-corr-0001' } }),
      noParams,
    );
    expect(res.status).toBe(503);
    expect(res.headers.get('x-correlation-id')).toBe('raw-corr-0001');
    expect(res.headers.get('cache-control')).toBe('no-store');

    const cached = apiHandler({
      auth: 'public',
      handler: async () =>
        new Response('x', { headers: { 'cache-control': 'public, max-age=60' } }),
    });
    expect(
      (await cached(new Request('http://localhost/x'), noParams)).headers.get('cache-control'),
    ).toBe('public, max-age=60');
  });
});

describe('apiHandler — input validation', () => {
  const route = apiHandler({
    body: z.object({ name: z.string().min(2), radiusKm: z.number().max(10) }),
    query: z.object({ dryRun: z.enum(['true', 'false']).optional() }),
    params: z.object({ id: z.uuid() }),
    handler: async ({ body, query, params }) =>
      created({ ...body, dryRun: query.dryRun ?? 'false', id: params.id }),
  });
  const params = { params: Promise.resolve({ id: '22222222-2222-4222-8222-222222222222' }) };

  it('passes typed, validated input to the handler', async () => {
    const res = await read(await route(post({ name: 'Al-Noor Builders', radiusKm: 8 }), params));
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      name: 'Al-Noor Builders',
      radiusKm: 8,
      dryRun: 'false',
      id: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('422s with field issues', async () => {
    const res = await read(await route(post({ name: 'A', radiusKm: 12 }), params));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.issues.map((i: { path: string }) => i.path).sort()).toEqual([
      'name',
      'radiusKm',
    ]);
  });

  it('422s bad path params', async () => {
    const res = await read(
      await route(post({ name: 'Ok', radiusKm: 1 }), { params: Promise.resolve({ id: 'nope' }) }),
    );
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe('Invalid path parameters');
  });

  it('400s malformed JSON, 415s non-JSON, 413s oversized bodies', async () => {
    expect((await route(post('{"name":'), params)).status).toBe(400);
    const form = new Request('http://localhost/x', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hi',
    });
    expect((await route(form, params)).status).toBe(415);
    const small = apiHandler({
      body: z.object({ note: z.string() }),
      maxBodyBytes: 32,
      handler: async () => ok(null),
    });
    const big = await read(await small(post({ note: 'x'.repeat(100) }), noParams));
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('apiHandler — errors and output contracts', () => {
  it('maps domain errors', async () => {
    const route = apiHandler({
      handler: async () => {
        throw new ConflictError('Company is already verified');
      },
    });
    const res = await read(await route(new Request('http://localhost/x'), noParams));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'CONFLICT',
      message: 'Company is already verified',
    });
  });

  it('turns unexpected errors into a generic 500', async () => {
    const route = apiHandler({
      handler: async () => {
        throw new Error('db password=secret leaked');
      },
    });
    const res = await read(await route(new Request('http://localhost/x'), noParams));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('blocks responses that break a strict output contract (PII leak guard)', async () => {
    const employerCandidate = z.object({ code: z.string(), skills: z.array(z.string()) }).strict();
    const route = apiHandler({
      output: employerCandidate,
      handler: async () => ok({ code: 'JB-KHI-00412', skills: ['wiring'], phone: '+923001234567' }),
    });
    const res = await read(await route(new Request('http://localhost/x'), noParams));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('+92300');
  });
});

describe('apiHandler — idempotency', () => {
  const handler = vi.fn(async ({ body }: { body: { amount: number } }) =>
    created({ id: 'p-1', amount: body.amount }),
  );
  const route = apiHandler({ idempotent: true, body: z.object({ amount: z.number() }), handler });

  beforeEach(() => {
    handler.mockClear();
  });

  it('requires a well-formed Idempotency-Key', async () => {
    expect((await read(await route(post({ amount: 1 }), noParams))).body.error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );
    expect(
      (await route(post({ amount: 1 }, { 'idempotency-key': 'bad key!' }), noParams)).status,
    ).toBe(400);
  });

  it('replays the original response for a retried request without re-running the handler', async () => {
    const key = { 'idempotency-key': 'key-aaaaaaaa' };
    const first = await read(await route(post({ amount: 5 }, key), noParams));
    // Same JSON, different key order, still the same request.
    const second = await read(await route(post('{ "amount": 5 }', key), noParams));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse of a key for a different payload', async () => {
    const key = { 'idempotency-key': 'key-bbbbbbbb' };
    await route(post({ amount: 5 }, key), noParams);
    const res = await read(await route(post({ amount: 6 }, key), noParams));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('keys are per user', async () => {
    const key = { 'idempotency-key': 'key-cccccccc' };
    await route(post({ amount: 5 }, key), noParams);
    mockedActor.mockResolvedValue(makeActor({ userId: '33333333-3333-4333-8333-333333333333' }));
    await route(post({ amount: 5 }, key), noParams);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('releases the key when the request fails so the client can retry', async () => {
    const flaky = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(created({ ok: true }));
    const r = apiHandler({ idempotent: true, body: z.object({ a: z.number() }), handler: flaky });
    const key = { 'idempotency-key': 'key-dddddddd' };
    expect((await r(post({ a: 1 }, key), noParams)).status).toBe(500);
    expect((await r(post({ a: 1 }, key), noParams)).status).toBe(201);
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});

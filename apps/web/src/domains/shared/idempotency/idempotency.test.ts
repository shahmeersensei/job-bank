import { describe, expect, it } from 'vitest';
import { createMemoryIdempotencyStore, requestHash } from './idempotency';

describe('requestHash', () => {
  it('ignores key order and undefined fields, but not values, method or path', () => {
    const base = requestHash('POST', '/api/v1/jobs', { a: 1, b: { c: [1, 2], d: 'x' } });
    expect(
      requestHash('post', '/api/v1/jobs', { b: { d: 'x', c: [1, 2] }, a: 1, e: undefined }),
    ).toBe(base);
    expect(requestHash('POST', '/api/v1/jobs', { a: 2, b: { c: [1, 2], d: 'x' } })).not.toBe(base);
    expect(requestHash('POST', '/api/v1/jobs', { a: 1, b: { c: [2, 1], d: 'x' } })).not.toBe(base);
    expect(requestHash('PATCH', '/api/v1/jobs', { a: 1, b: { c: [1, 2], d: 'x' } })).not.toBe(base);
  });
});

describe('memory idempotency store', () => {
  it('follows new → in_progress → replay, and detects mismatches', async () => {
    const store = createMemoryIdempotencyStore();
    expect(await store.begin('u', 'k', 'POST /x', 'h1')).toEqual({ state: 'new' });
    expect(await store.begin('u', 'k', 'POST /x', 'h1')).toEqual({ state: 'in_progress' });
    await store.complete('u', 'k', 201, { data: 1 });
    expect(await store.begin('u', 'k', 'POST /x', 'h1')).toEqual({
      state: 'replay',
      status: 201,
      body: { data: 1 },
    });
    expect(await store.begin('u', 'k', 'POST /x', 'h2')).toEqual({ state: 'mismatch' });
  });

  it('release frees only in-progress keys', async () => {
    const store = createMemoryIdempotencyStore();
    await store.begin('u', 'k', 'r', 'h');
    await store.release('u', 'k');
    expect(await store.begin('u', 'k', 'r', 'h')).toEqual({ state: 'new' });
    await store.complete('u', 'k', 200, null);
    await store.release('u', 'k');
    expect((await store.begin('u', 'k', 'r', 'h')).state).toBe('replay');
  });
});

import { apiErrorSchema } from '@jobbank/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ConflictError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
  RateLimitedError,
  ScopeViolationError,
  UnauthenticatedError,
  ValidationError,
} from './errors';
import { toErrorResponse } from './to-response';

const CID = 'corr-12345678';

describe('toErrorResponse', () => {
  it.each([
    [new UnauthenticatedError(), 401, 'UNAUTHENTICATED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new ScopeViolationError(), 403, 'SCOPE_VIOLATION'],
    [new NotFoundError('Company', 'c-1'), 404, 'NOT_FOUND'],
    [new ConflictError('Already verified'), 409, 'CONFLICT'],
    [new InvalidTransitionError('company', 'VERIFIED', 'VERIFY'), 409, 'INVALID_TRANSITION'],
  ])('maps %s', (error, status, code) => {
    const res = toErrorResponse(error, CID);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(res.body.error.correlation_id).toBe(CID);
    expect(res.unexpected).toBe(false);
    expect(apiErrorSchema.parse(res.body)).toEqual(res.body);
  });

  it('writes a readable message for invalid transitions', () => {
    expect(new InvalidTransitionError('company', 'VERIFIED', 'REQUEST_INFO').message).toBe(
      'Cannot request info a company that is verified',
    );
  });

  it('includes field issues for validation errors (domain and zod)', () => {
    const domain = toErrorResponse(
      new ValidationError([{ path: 'cnic', message: 'Invalid CNIC' }]),
      CID,
    );
    expect(domain.status).toBe(422);
    expect(domain.body.error.issues).toEqual([{ path: 'cnic', message: 'Invalid CNIC' }]);

    const parsed = z.object({ age: z.number().min(18) }).safeParse({ age: 12 });
    const zod = toErrorResponse(parsed.error, CID);
    expect(zod.status).toBe(422);
    expect(zod.body.error.issues?.[0]?.path).toBe('age');
  });

  it('adds Retry-After for rate limits', () => {
    expect(toErrorResponse(new RateLimitedError(30), CID).headers).toEqual({ 'retry-after': '30' });
  });

  it('translates Postgres errors, including when wrapped by drizzle', () => {
    const unique = Object.assign(new Error('duplicate key value'), { code: '23505' });
    expect(toErrorResponse(unique, CID).body.error.code).toBe('CONFLICT');

    const wrapped = new Error('Failed query: UPDATE audit_logs', {
      cause: Object.assign(new Error('table "audit_logs" is append-only'), { code: 'JB001' }),
    });
    const res = toErrorResponse(wrapped, CID);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPEND_ONLY_VIOLATION');
  });

  it('hides internals of unexpected errors', () => {
    const res = toErrorResponse(
      new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'),
      CID,
    );
    expect(res.status).toBe(500);
    expect(res.unexpected).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5/);
  });
});

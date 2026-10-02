import { HEADERS, type Permission, type Role } from '@jobbank/shared';
import type { z } from 'zod';
import { env } from '@/lib/env';
import { resolveCorrelationId } from '@/lib/http/correlation';
import { logger } from '@/lib/logger';
import { recordAudit, type RequestContext } from '../audit';
import {
  BadRequestError,
  DomainError,
  ForbiddenError,
  ScopeViolationError,
  UnauthenticatedError,
  ValidationError,
} from '../errors';
import { toErrorResponse, zodIssues } from '../errors/to-response';
import {
  IDEMPOTENCY_KEY_PATTERN,
  postgresIdempotencyStore,
  requestHash,
  type IdempotencyStore,
} from '../idempotency';
import { searchParamsToObject } from '../pagination';
import { hasPermission, hasRole, type Actor } from '../scope';
import { resolveActor } from './actor';
import type { HandlerResult } from './responses';

type AnySchema = z.ZodType;
type Infer<S> = S extends z.ZodType ? z.infer<S> : undefined;

export interface HandlerArgs<B, Q, P> {
  request: Request;
  ctx: RequestContext;
  /** Non-null whenever `auth` is 'required' (the default). */
  actor: Actor | null;
  body: B;
  query: Q;
  params: P;
}

export interface ApiHandlerOptions<
  BS extends AnySchema | undefined,
  QS extends AnySchema | undefined,
  PS extends AnySchema | undefined,
> {
  /** Default 'required'. 'public' endpoints still receive the actor when one is signed in. */
  auth?: 'required' | 'public';
  /** Coarse role gate (any of). */
  roles?: readonly Role[];
  /** Permission gate. Ownership + branch scope are still checked in domain services. */
  permission?: Permission;
  /**
   * Allow actors who must still enrol two-factor authentication (Super Admin / Branch
   * Admin before setup). Only for the endpoints needed to finish setup or sign out.
   */
  allowTwoFactorPending?: boolean;
  body?: BS;
  query?: QS;
  params?: PS;
  /**
   * Schema the response `data` must satisfy. Use strict schemas for anything employer-facing:
   * an unexpected field fails the request instead of leaking (PRD rule 3).
   */
  output?: AnySchema;
  /** Require an Idempotency-Key header and replay duplicates (PRD §8). */
  idempotent?: boolean;
  maxBodyBytes?: number;
  handler: (
    args: HandlerArgs<Infer<BS>, Infer<QS>, Infer<PS>>,
  ) => Promise<HandlerResult | Response>;
}

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

class PayloadTooLargeError extends DomainError {
  constructor(limit: number) {
    super('PAYLOAD_TOO_LARGE', 413, `Request body exceeds ${Math.round(limit / 1024)} KB`);
  }
}
class UnsupportedMediaTypeError extends DomainError {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE', 415, 'Send the request body as application/json');
  }
}
class IdempotencyError extends DomainError {}

/** Overridable for tests. */
export const handlerDeps: { idempotencyStore: IdempotencyStore } = {
  idempotencyStore: postgresIdempotencyStore,
};

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence for cookie-authenticated writes: browsers always send Origin (and
 * Sec-Fetch-Site) on cross-site requests, so an unsafe request from a foreign origin is
 * refused. Non-browser clients (no Origin header) are unaffected.
 */
function assertSameOrigin(request: Request, url: URL): void {
  if (!UNSAFE_METHODS.has(request.method)) return;
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ForbiddenError('Cross-site request blocked');
  }
  const origin = request.headers.get('origin');
  if (!origin) return;
  const allowed = new Set([url.origin]);
  try {
    allowed.add(new URL(env.NEXT_PUBLIC_APP_URL).origin);
  } catch {
    // App URL not configured (some test setups): the same-origin check still applies.
  }
  if (!allowed.has(origin)) throw new ForbiddenError('Cross-site request blocked');
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

function parseWith<S extends AnySchema>(schema: S, value: unknown, label: string): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError(zodIssues(result.error), `Invalid ${label}`);
  return result.data;
}

async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) throw new UnsupportedMediaTypeError();
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new PayloadTooLargeError(maxBytes);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError('Request body is not valid JSON');
  }
}

function json(
  status: number,
  body: unknown,
  headers: Record<string, string>,
  cookies: string[] = [],
): Response {
  const out = new Headers(headers);
  for (const cookie of cookies) out.append('set-cookie', cookie);
  if (status === 204) return new Response(null, { status, headers: out });
  out.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers: out });
}

/**
 * The one pipeline every /api/v1 route goes through:
 * correlation id → CSRF origin check → actor → role/permission gate → params/query/body
 * validation → idempotency → handler → output contract → envelope. Any thrown error becomes
 * the PRD §8 error format; denied cross-scope access is audited.
 */
export function apiHandler<
  BS extends AnySchema | undefined = undefined,
  QS extends AnySchema | undefined = undefined,
  PS extends AnySchema | undefined = undefined,
>(options: ApiHandlerOptions<BS, QS, PS>) {
  const maxBodyBytes = options.maxBodyBytes ?? 1024 * 1024;

  return async function route(request: Request, routeContext: RouteContext): Promise<Response> {
    const started = performance.now();
    const url = new URL(request.url);
    const correlationId = resolveCorrelationId(request.headers.get(HEADERS.correlationId));
    const log = logger.child({ correlationId });
    const baseHeaders: Record<string, string> = {
      [HEADERS.correlationId]: correlationId,
      'cache-control': 'no-store',
    };

    let actor: Actor | null = null;
    let ctx: RequestContext | null = null;
    let idempotency: { scope: string; key: string } | null = null;
    let status = 500;

    try {
      assertSameOrigin(request, url);
      actor = await resolveActor(request);
      ctx = {
        actor,
        system: false,
        correlationId,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent'),
        log: log.child({ actorId: actor?.userId }),
      };

      if ((options.auth ?? 'required') === 'required' && !actor) throw new UnauthenticatedError();
      if (actor?.twoFactorPending && !options.allowTwoFactorPending) {
        throw new ForbiddenError('Set up two-factor authentication to continue', {
          reason: 'TWO_FACTOR_SETUP_REQUIRED',
        });
      }
      if (options.roles && (!actor || !hasRole(actor, ...options.roles))) {
        throw new ForbiddenError();
      }
      if (options.permission && (!actor || !hasPermission(actor, options.permission))) {
        throw new ForbiddenError();
      }

      const params = options.params
        ? parseWith(options.params, (await routeContext.params) ?? {}, 'path parameters')
        : undefined;
      const query = options.query
        ? parseWith(options.query, searchParamsToObject(url.searchParams), 'query parameters')
        : undefined;
      const rawBody = options.body ? await readJsonBody(request, maxBodyBytes) : undefined;
      const body = options.body ? parseWith(options.body, rawBody, 'request body') : undefined;

      if (options.idempotent) {
        const key = request.headers.get(HEADERS.idempotencyKey);
        if (!key) {
          throw new IdempotencyError(
            'IDEMPOTENCY_KEY_REQUIRED',
            400,
            'This request needs an Idempotency-Key header',
          );
        }
        if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
          throw new IdempotencyError(
            'IDEMPOTENCY_KEY_REQUIRED',
            400,
            'Idempotency-Key must be 8–128 letters, digits, _ or -',
          );
        }
        const scope = actor?.userId ?? 'anonymous';
        const route = `${request.method} ${url.pathname}`;
        const begin = await handlerDeps.idempotencyStore.begin(
          scope,
          key,
          route,
          requestHash(request.method, url.pathname, rawBody),
        );
        if (begin.state === 'mismatch') {
          throw new IdempotencyError(
            'IDEMPOTENCY_CONFLICT',
            422,
            'This Idempotency-Key was already used for a different request',
          );
        }
        if (begin.state === 'in_progress') {
          throw new IdempotencyError(
            'IDEMPOTENCY_IN_PROGRESS',
            409,
            'The original request is still being processed',
          );
        }
        if (begin.state === 'replay') {
          status = begin.status;
          return json(begin.status, begin.body, {
            ...baseHeaders,
            [HEADERS.idempotentReplay]: 'true',
          });
        }
        idempotency = { scope, key };
      }

      const result = await options.handler({
        request,
        ctx,
        actor,
        body,
        query,
        params,
      } as HandlerArgs<Infer<BS>, Infer<QS>, Infer<PS>>);

      if (result instanceof Response) {
        if (idempotency) {
          throw new Error('Idempotent handlers must return a HandlerResult, not a raw Response');
        }
        status = result.status;
        result.headers.set(HEADERS.correlationId, correlationId);
        // API responses are per-request; a route may opt into caching by setting its own header.
        if (!result.headers.has('cache-control')) result.headers.set('cache-control', 'no-store');
        return result;
      }

      if (options.output && result.data !== undefined) {
        const checked = options.output.safeParse(result.data);
        if (!checked.success) {
          log.error('response failed its output contract', {
            route: url.pathname,
            issues: zodIssues(checked.error),
          });
          throw new Error('Response failed its output contract');
        }
        result.data = checked.data;
      }

      const envelope =
        result.status === 204
          ? null
          : { data: result.data, ...(result.meta ? { meta: result.meta } : {}) };
      if (idempotency) {
        await handlerDeps.idempotencyStore.complete(
          idempotency.scope,
          idempotency.key,
          result.status,
          envelope,
        );
      }
      idempotency = null;
      status = result.status;
      return json(result.status, envelope, { ...baseHeaders, ...result.headers }, result.cookies);
    } catch (error) {
      if (idempotency) {
        await handlerDeps.idempotencyStore
          .release(idempotency.scope, idempotency.key)
          .catch((err: unknown) => log.error('failed to release idempotency key', { err }));
      }
      if (error instanceof ScopeViolationError && ctx) {
        // PRD: a denied cross-scope access attempt is itself an auditable event.
        await recordAudit(ctx, {
          action: 'access.scope_violation',
          entityType: error.target?.entityType ?? 'unknown',
          entityId: error.target?.entityId ?? null,
          branchId: error.target?.branchId ?? null,
          metadata: { method: request.method, path: url.pathname },
        }).catch((err: unknown) => log.error('failed to audit scope violation', { err }));
      }
      const mapped = toErrorResponse(error, correlationId);
      status = mapped.status;
      if (mapped.unexpected) {
        log.error('unhandled error', { method: request.method, path: url.pathname, err: error });
      }
      return json(mapped.status, mapped.body, { ...baseHeaders, ...mapped.headers });
    } finally {
      log.info('request', {
        method: request.method,
        path: url.pathname,
        status,
        durationMs: Math.round(performance.now() - started),
        actorId: actor?.userId,
      });
    }
  };
}

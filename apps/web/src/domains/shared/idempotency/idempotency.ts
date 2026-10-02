import { createHash } from 'node:crypto';
import { schema } from '@jobbank/db';
import { and, eq, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';

/** Client-supplied keys: 8–128 URL-safe characters (UUIDs fit). */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** An in-progress record older than this is assumed abandoned (crashed request) and reclaimed. */
const STALE_IN_PROGRESS = '2 minutes';

export type BeginResult =
  | { state: 'new' }
  | { state: 'replay'; status: number; body: unknown }
  | { state: 'in_progress' }
  | { state: 'mismatch' };

export interface IdempotencyStore {
  /** Claim the key, or report what already happened with it. */
  begin(scope: string, key: string, route: string, requestHash: string): Promise<BeginResult>;
  /** Store the response so retries get exactly the same answer. */
  complete(scope: string, key: string, status: number, body: unknown): Promise<void>;
  /** Forget the key (the request failed; let the client retry). */
  release(scope: string, key: string): Promise<void>;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** Same method + path + body (regardless of key order) ⇒ same hash. */
export function requestHash(method: string, path: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method.toUpperCase()} ${path}\n${canonicalJson(body ?? null)}`)
    .digest('hex');
}

export const postgresIdempotencyStore: IdempotencyStore = {
  async begin(scope, key, route, hash) {
    const t = schema.idempotencyKeys;
    const claimed = await db
      .insert(t)
      .values({ scope, key, route, requestHash: hash })
      .onConflictDoUpdate({
        target: [t.scope, t.key],
        set: {
          route,
          requestHash: hash,
          status: 'in_progress',
          responseStatus: null,
          responseBody: null,
          createdAt: sql`now()`,
          expiresAt: sql`now() + interval '24 hours'`,
        },
        // Only reclaim expired keys or abandoned in-progress ones.
        setWhere: or(
          lt(t.expiresAt, sql`now()`),
          and(
            eq(t.status, 'in_progress'),
            lt(t.createdAt, sql`now() - ${sql.raw(`interval '${STALE_IN_PROGRESS}'`)}`),
          ),
        ),
      })
      .returning({ key: t.key });
    if (claimed.length > 0) return { state: 'new' };

    const [existing] = await db
      .select()
      .from(t)
      .where(and(eq(t.scope, scope), eq(t.key, key)));
    if (!existing) return { state: 'new' }; // deleted between statements; treat as fresh
    if (existing.route !== route || existing.requestHash !== hash) return { state: 'mismatch' };
    if (existing.status === 'in_progress') return { state: 'in_progress' };
    return { state: 'replay', status: existing.responseStatus ?? 200, body: existing.responseBody };
  },

  async complete(scope, key, status, body) {
    const t = schema.idempotencyKeys;
    await db
      .update(t)
      .set({ status: 'completed', responseStatus: status, responseBody: body as object })
      .where(and(eq(t.scope, scope), eq(t.key, key)));
  },

  async release(scope, key) {
    const t = schema.idempotencyKeys;
    await db.delete(t).where(and(eq(t.scope, scope), eq(t.key, key), eq(t.status, 'in_progress')));
  },
};

/** In-memory store with the same semantics (unit tests). */
export function createMemoryIdempotencyStore(): IdempotencyStore {
  const records = new Map<
    string,
    {
      route: string;
      hash: string;
      status: 'in_progress' | 'completed';
      responseStatus?: number;
      body?: unknown;
    }
  >();
  const id = (scope: string, key: string) => `${scope}\u0000${key}`;
  return {
    async begin(scope, key, route, hash) {
      const existing = records.get(id(scope, key));
      if (!existing) {
        records.set(id(scope, key), { route, hash, status: 'in_progress' });
        return { state: 'new' };
      }
      if (existing.route !== route || existing.hash !== hash) return { state: 'mismatch' };
      if (existing.status === 'in_progress') return { state: 'in_progress' };
      return { state: 'replay', status: existing.responseStatus ?? 200, body: existing.body };
    },
    async complete(scope, key, status, body) {
      const existing = records.get(id(scope, key));
      if (existing) Object.assign(existing, { status: 'completed', responseStatus: status, body });
    },
    async release(scope, key) {
      if (records.get(id(scope, key))?.status === 'in_progress') records.delete(id(scope, key));
    },
  };
}

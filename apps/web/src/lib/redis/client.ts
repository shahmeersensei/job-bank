import 'server-only';
import Redis from 'ioredis';
import { env } from '@/lib/env';

const globalForRedis = globalThis as unknown as { jobbankRedis?: Redis | null };

/**
 * Redis is optional until Phase 4. Returns `null` when REDIS_URL is unset so callers
 * can degrade gracefully (e.g. skip caching) instead of crashing.
 */
export function getRedis(): Redis | null {
  if (globalForRedis.jobbankRedis !== undefined) return globalForRedis.jobbankRedis;
  if (!env.REDIS_URL) return (globalForRedis.jobbankRedis = null);

  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  });
  // Log transitions only: ioredis retries forever, and connection errors are often an
  // AggregateError with an empty message (one failure per resolved address).
  let healthy = true;
  redis.on('error', (error: NodeJS.ErrnoException) => {
    if (!healthy) return;
    healthy = false;
    console.warn(
      `[redis] connection lost (${error.code ?? error.message ?? 'unknown error'}); retrying in background`,
    );
  });
  redis.on('ready', () => {
    if (healthy) return;
    healthy = true;
    console.info('[redis] connection restored');
  });
  return (globalForRedis.jobbankRedis = redis);
}

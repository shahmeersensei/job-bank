export const CORRELATION_HEADER = 'x-correlation-id';

// Accept caller-supplied IDs only if they are short and log-safe.
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Reuses a well-formed incoming correlation ID, otherwise mints a new one. */
export function resolveCorrelationId(incoming: string | null | undefined): string {
  return incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
}

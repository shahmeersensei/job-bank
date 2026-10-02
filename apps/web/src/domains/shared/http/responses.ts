import type { PaginationMeta } from '@jobbank/shared';

/** What a route handler returns; apiHandler turns it into the JSON envelope. */
export interface HandlerResult<T = unknown> {
  status: number;
  data?: T;
  meta?: PaginationMeta;
  headers?: Record<string, string>;
  /** Raw Set-Cookie values (sessions); each becomes its own header. */
  cookies?: string[];
}

export const ok = <T>(data: T, meta?: PaginationMeta): HandlerResult<T> => ({
  status: 200,
  data,
  meta,
});
export const created = <T>(data: T, location?: string): HandlerResult<T> => ({
  status: 201,
  data,
  headers: location ? { location } : undefined,
});
export const accepted = <T>(data: T): HandlerResult<T> => ({ status: 202, data });
export const noContent = (): HandlerResult<never> => ({ status: 204 });

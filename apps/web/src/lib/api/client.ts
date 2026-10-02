'use client';

import type { ApiError, FieldIssue, PaginationMeta } from '@jobbank/shared';

/** Error thrown by apiFetch for any non-2xx response, carrying the PRD §8 error envelope. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiError['error']['code'] | 'NETWORK';
  readonly issues: FieldIssue[];
  readonly details: unknown;
  readonly correlationId: string | undefined;

  constructor(
    status: number,
    body: ApiError | null,
    fallback = 'Something went wrong. Please try again.',
  ) {
    super(body?.error.message ?? fallback);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body?.error.code ?? 'NETWORK';
    this.issues = body?.error.issues ?? [];
    this.details = body?.error.details;
    this.correlationId = body?.error.correlation_id;
  }

  /** Message for one form field, if the server reported one. */
  issueFor(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message;
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Pass for idempotent writes; reuse the same key when retrying the same action. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/** Same-origin JSON client for /api/v1. Returns the `data` (and `meta`) of the envelope. */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ data: T; meta?: PaginationMeta }> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch {
    throw new ApiClientError(0, null, 'Cannot reach the server. Check your internet connection.');
  }

  if (response.status === 204) return { data: undefined as T };
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new ApiClientError(response.status, json as ApiError | null);
  return json as { data: T; meta?: PaginationMeta };
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return null;
  return next;
}

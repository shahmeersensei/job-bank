import { z } from 'zod';

/** Machine-readable error codes returned by every /api/v1 endpoint. */
export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'SCOPE_VIOLATION',
  'NOT_FOUND',
  'CONFLICT',
  'INVALID_TRANSITION',
  'APPEND_ONLY_VIOLATION',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_IN_PROGRESS',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const fieldIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

/** PRD §8: consistent error format with correlation_id. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.unknown().optional(),
    issues: z.array(fieldIssueSchema).optional(),
    correlation_id: z.string(),
  }),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  pageCount: z.number().int().min(0),
});

export type FieldIssue = z.infer<typeof fieldIssueSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** Success envelopes. */
export interface ApiData<T> {
  data: T;
}

export interface ApiPage<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Header names used across the API. */
export const HEADERS = {
  correlationId: 'x-correlation-id',
  idempotencyKey: 'idempotency-key',
  idempotentReplay: 'idempotent-replayed',
} as const;

import type { ApiError, ErrorCode, FieldIssue } from '@jobbank/shared';
import { ZodError } from 'zod';
import { DomainError, RateLimitedError, ValidationError } from './errors';

export interface ErrorResponse {
  status: number;
  body: ApiError;
  headers?: Record<string, string>;
  /** True for unexpected errors that must be logged with a stack trace. */
  unexpected: boolean;
}

export function zodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}

/** Postgres SQLSTATEs we translate into meaningful API errors. */
const PG_ERRORS: Record<string, { code: ErrorCode; status: number; message: string }> = {
  '23505': { code: 'CONFLICT', status: 409, message: 'A record with these details already exists' },
  '23503': {
    code: 'CONFLICT',
    status: 409,
    message: 'A related record does not exist or is still in use',
  },
  '23514': { code: 'VALIDATION_FAILED', status: 422, message: 'The data breaks a validation rule' },
  JB001: {
    code: 'APPEND_ONLY_VIOLATION',
    status: 409,
    message: 'This record is permanent and cannot be changed',
  },
};

function pgCode(error: unknown): string | undefined {
  // drizzle wraps driver errors; the SQLSTATE lives on the error or its cause.
  for (let current: unknown = error, depth = 0; current && depth < 4; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Maps any thrown value to the PRD §8 error envelope. Never leaks internals for 5xx. */
export function toErrorResponse(error: unknown, correlationId: string): ErrorResponse {
  const envelope = (
    code: ErrorCode,
    message: string,
    extra: Partial<ApiError['error']> = {},
  ): ApiError => ({
    error: { code, message, ...extra, correlation_id: correlationId },
  });

  if (error instanceof ValidationError) {
    return {
      status: 422,
      body: envelope(error.code, error.message, { issues: error.issues }),
      unexpected: false,
    };
  }
  if (error instanceof ZodError) {
    return {
      status: 422,
      body: envelope('VALIDATION_FAILED', 'Some fields are invalid', { issues: zodIssues(error) }),
      unexpected: false,
    };
  }
  if (error instanceof DomainError) {
    return {
      status: error.status,
      body: envelope(
        error.code,
        error.message,
        error.details !== undefined ? { details: error.details } : {},
      ),
      headers:
        error instanceof RateLimitedError
          ? { 'retry-after': String(error.retryAfterSeconds) }
          : undefined,
      unexpected: false,
    };
  }

  const mapped = pgCode(error);
  if (mapped && PG_ERRORS[mapped]) {
    const { code, status, message } = PG_ERRORS[mapped];
    return { status, body: envelope(code, message), unexpected: false };
  }

  return {
    status: 500,
    body: envelope('INTERNAL', 'Something went wrong on our side. Please try again.'),
    unexpected: true,
  };
}

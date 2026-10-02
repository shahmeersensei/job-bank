import type { ErrorCode, FieldIssue } from '@jobbank/shared';

/**
 * Base class for expected, user-facing failures. Anything that is NOT a DomainError
 * is treated as a bug: logged with its stack and returned as a generic 500.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, status: number, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends DomainError {
  constructor(message = 'Bad request', details?: unknown) {
    super('BAD_REQUEST', 400, message, details);
  }
}

export class ValidationError extends DomainError {
  readonly issues: FieldIssue[];
  constructor(issues: FieldIssue[], message = 'Some fields are invalid') {
    super('VALIDATION_FAILED', 422, message);
    this.issues = issues;
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Sign in to continue') {
    super('UNAUTHENTICATED', 401, message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You do not have permission to do this', details?: unknown) {
    super('FORBIDDEN', 403, message, details);
  }
}

export interface ScopeTarget {
  entityType: string;
  entityId?: string;
  branchId?: string | null;
}

/** The actor has the right role, but the record belongs to another branch/company/applicant. */
export class ScopeViolationError extends DomainError {
  /** What was being accessed — recorded in the audit log, never sent to the client. */
  readonly target?: ScopeTarget;
  constructor(message = 'This record is outside your access scope', target?: ScopeTarget) {
    super('SCOPE_VIOLATION', 403, message);
    this.target = target;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super('NOT_FOUND', 404, id ? `${entity} ${id} was not found` : `${entity} was not found`);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', 409, message, details);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(machine: string, from: string, event: string, reason?: string) {
    super(
      'INVALID_TRANSITION',
      409,
      reason ??
        `Cannot ${event.toLowerCase().replace(/_/g, ' ')} a ${machine} that is ${from.toLowerCase().replace(/_/g, ' ')}`,
      { machine, from, event },
    );
  }
}

export class RateLimitedError extends DomainError {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = 'Too many requests. Please try again later.') {
    super('RATE_LIMITED', 429, message, { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

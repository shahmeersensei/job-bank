export {
  BadRequestError,
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
  RateLimitedError,
  ScopeViolationError,
  UnauthenticatedError,
  ValidationError,
  type ScopeTarget,
} from './errors';
export { toErrorResponse, zodIssues, type ErrorResponse } from './to-response';

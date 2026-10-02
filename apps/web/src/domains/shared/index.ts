/**
 * Shared kernel: cross-domain building blocks. Domains import from here only
 * (never from another domain's internals).
 */
export * from './audit';
export * from './errors';
export * from './events';
export * from './http';
export * from './idempotency';
export * from './masking';
export * from './pagination';
export * from './rate-limit';
export * from './scope';
export * from './state-machine';

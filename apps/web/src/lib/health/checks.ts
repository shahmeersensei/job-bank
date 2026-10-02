import type { DependencyStatus, HealthResponse } from '@jobbank/shared';

type DependencyName = keyof HealthResponse['dependencies'];

/** A probe resolves (optionally with a detail string) when healthy and throws otherwise. */
export type HealthProbe = () => Promise<string | void>;

export interface RunHealthChecksOptions {
  version: string;
  timeoutMs?: number;
  /** Include error messages in the response (disable in production). */
  exposeErrors?: boolean;
  now?: () => Date;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function probe(
  fn: HealthProbe | null,
  timeoutMs: number,
  exposeErrors: boolean,
): Promise<DependencyStatus> {
  if (!fn) return { status: 'disabled' };
  const started = performance.now();
  try {
    const detail = await withTimeout(fn(), timeoutMs);
    return {
      status: 'up',
      latencyMs: Math.round(performance.now() - started),
      ...(detail ? { detail } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - started),
      ...(exposeErrors ? { detail: message } : {}),
    };
  }
}

/** Runs all probes in parallel. A `null` probe means the dependency is intentionally disabled. */
export async function runHealthChecks(
  probes: Record<DependencyName, HealthProbe | null>,
  {
    version,
    timeoutMs = 2_000,
    exposeErrors = true,
    now = () => new Date(),
  }: RunHealthChecksOptions,
): Promise<HealthResponse> {
  const names = Object.keys(probes) as DependencyName[];
  const results = await Promise.all(
    names.map((name) => probe(probes[name], timeoutMs, exposeErrors)),
  );
  const dependencies = Object.fromEntries(
    names.map((name, i) => [name, results[i]]),
  ) as HealthResponse['dependencies'];

  const healthy = results.every((r) => r.status !== 'down');
  return { status: healthy ? 'ok' : 'degraded', version, time: now().toISOString(), dependencies };
}

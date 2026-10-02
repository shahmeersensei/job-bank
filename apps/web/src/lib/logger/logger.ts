import { redactPii } from '@/lib/privacy/redact';

type Level = 'debug' | 'info' | 'warn' | 'error';
type Threshold = Level | 'silent';
type Fields = Record<string, unknown>;

const order: Record<Threshold, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function minLevel(): Threshold {
  const configured = process.env.LOG_LEVEL as Threshold | undefined;
  if (configured && configured in order) return configured;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function serializeError(error: unknown): Fields {
  if (!(error instanceof Error)) return { error: String(error) };
  return {
    error: {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
      ...('code' in error ? { code: (error as { code: unknown }).code } : {}),
    },
  };
}

export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields & { err?: unknown }): void;
  /** Logger that adds `bindings` (e.g. correlationId) to every line. */
  child(bindings: Fields): Logger;
}

/**
 * Structured logger: JSON lines in production (for log shipping), readable lines in
 * development. Every field passes through PII redaction.
 */
export function createLogger(bindings: Fields = {}): Logger {
  const write = (level: Level, message: string, fields: Fields = {}) => {
    if (order[level] < order[minLevel()]) return;
    const { err, ...rest } = fields;
    const payload = redactPii({
      ...bindings,
      ...rest,
      ...(err !== undefined ? serializeError(err) : {}),
    });

    if (process.env.NODE_ENV === 'production') {
      const line = JSON.stringify({
        level,
        time: new Date().toISOString(),
        msg: message,
        ...payload,
      });
      (level === 'error' ? console.error : console.info)(line);
      return;
    }
    const extra = Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : '';
    const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    out(`[${level}] ${message}${extra}`);
  };

  return {
    debug: (m, f) => write('debug', m, f),
    info: (m, f) => write('info', m, f),
    warn: (m, f) => write('warn', m, f),
    error: (m, f) => write('error', m, f),
    child: (more) => createLogger({ ...bindings, ...more }),
  };
}

export const logger = createLogger();

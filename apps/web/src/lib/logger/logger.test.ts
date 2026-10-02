import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';

afterEach(() => vi.unstubAllEnvs());

describe('logger', () => {
  it('redacts personal data and includes bindings', () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    createLogger({ correlationId: 'corr-1' }).info('applicant registered', {
      applicantId: 'a-1',
      cnic: '4210112345671',
      phone: '+923001234567',
    });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain('applicant registered');
    expect(line).toContain('"correlationId":"corr-1"');
    expect(line).toContain('"applicantId":"a-1"');
    expect(line).not.toContain('4210112345671');
    expect(line).not.toContain('3001234567');
    spy.mockRestore();
  });

  it('writes JSON lines in production and keeps error codes', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'info');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger().error('db down', {
      err: Object.assign(new Error('connect refused'), { code: 'ECONNREFUSED' }),
    });
    const entry = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: 'error',
      msg: 'db down',
      error: { message: 'connect refused', code: 'ECONNREFUSED' },
    });
    expect(entry.error.stack).toBeUndefined();
    spy.mockRestore();
  });

  it('respects the level threshold', () => {
    vi.stubEnv('LOG_LEVEL', 'warn');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    createLogger().info('noise');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

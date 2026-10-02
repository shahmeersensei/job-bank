import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/sms/sms', () => ({ getSmsSender: () => ({ send: async () => {} }) }));

const { generateOtpCode, hashOtp } = await import('./otp');

describe('OTP codes', () => {
  it('are 6 digits, zero-padded', () => {
    for (let i = 0; i < 200; i += 1) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('hash deterministically, bound to both phone and secret', () => {
    const secret = 'x'.repeat(40);
    const h = hashOtp('+923001234567', '123456', secret);
    expect(hashOtp('+923001234567', '123456', secret)).toBe(h);
    expect(hashOtp('+923331234567', '123456', secret)).not.toBe(h);
    expect(hashOtp('+923001234567', '123457', secret)).not.toBe(h);
    expect(hashOtp('+923001234567', '123456', 'y'.repeat(40))).not.toBe(h);
    expect(h).not.toContain('123456');
  });
});

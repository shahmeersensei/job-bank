import 'server-only';
import { env } from '@/lib/env';

const DEV_ONLY_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

/** Signs sessions and keys OTP hashes. Production refuses to start without a real secret. */
export function getAuthSecret(): string {
  if (env.BETTER_AUTH_SECRET) return env.BETTER_AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET must be set in production (openssl rand -base64 32)');
  }
  return DEV_ONLY_SECRET;
}

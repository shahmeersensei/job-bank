import 'server-only';
import { env } from '@/lib/env';
import { maskPhoneForLog } from './mask';

export interface SmsSender {
  send(to: string, message: string): Promise<void>;
}

/** Recent messages, kept only outside production so tests and local QA can read OTPs. */
export const devOutbox: { to: string; message: string; at: Date }[] = [];

const consoleSender: SmsSender = {
  async send(to, message) {
    devOutbox.push({ to, message, at: new Date() });
    if (devOutbox.length > 50) devOutbox.shift();
    if (process.env.NODE_ENV !== 'test') {
      // Deliberately printed in full: this sender only exists for local development.
      console.info(`\n📱 [dev SMS → ${maskPhoneForLog(to)}] ${message}\n`);
    }
  },
};

export function getSmsSender(): SmsSender {
  if (env.SMS_PROVIDER === 'console') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SMS_PROVIDER=console cannot be used in production; configure a real SMS gateway',
      );
    }
    return consoleSender;
  }
  throw new Error(`Unsupported SMS_PROVIDER ${env.SMS_PROVIDER as string}`);
}

import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Messages sent with MAIL_TRANSPORT=memory (tests read them from here). */
export const mailOutbox: (MailMessage & { at: Date })[] = [];

const globalForMail = globalThis as unknown as { jobbankMailer?: Transporter };

function transporter(): Transporter {
  return (globalForMail.jobbankMailer ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  }));
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (env.MAIL_TRANSPORT === 'memory') {
    mailOutbox.push({ ...message, at: new Date() });
    if (mailOutbox.length > 100) mailOutbox.shift();
    return;
  }
  try {
    await transporter().sendMail({ from: env.EMAIL_FROM, ...message });
  } catch (err) {
    logger.error('email delivery failed', { subject: message.subject, err });
    throw new Error('Could not send email right now. Please try again shortly.');
  }
}

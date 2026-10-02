import { z } from 'zod';

/** Password policy for staff and employer accounts (shared by UI hints and the API). */
export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Use at most 128 characters')
  .refine(
    (value) => /[A-Za-z]/.test(value) && /\d/.test(value),
    'Include at least one letter and one number',
  );

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`;

/** Six-digit codes (SMS, email, authenticator app). */
export const sixDigitCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

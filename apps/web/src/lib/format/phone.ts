/**
 * Pakistani mobile numbers. Canonical storage format is E.164: +92 3XX XXXXXXX → "+923001234567".
 * Mobile numbers start with 3 after the country code and have 10 national digits.
 */

const NATIONAL_MOBILE = /^3\d{9}$/;

/** Extracts the 10-digit national mobile number from any common way people type it. */
export function toNationalMobileDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92') && digits.length > 10) digits = digits.slice(2);
  else if (digits.startsWith('03')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Returns E.164 (+923XXXXXXXXX) or null if the input is not a valid PK mobile number. */
export function normalizePkMobile(input: string): string | null {
  const national = toNationalMobileDigits(input);
  return NATIONAL_MOBILE.test(national) ? `+92${national}` : null;
}

/** "3001234567" → "300 1234567" (partial input is formatted progressively). */
export function formatPkMobileNational(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(0, 10);
  return clean.length <= 3 ? clean : `${clean.slice(0, 3)} ${clean.slice(3)}`;
}

/** "+923001234567" → "+92 300 1234567" for display. */
export function formatPkMobileDisplay(e164: string): string {
  const national = toNationalMobileDigits(e164);
  return national ? `+92 ${formatPkMobileNational(national)}` : e164;
}

import { toNationalMobileDigits } from '@/lib/format/phone';

export { maskCnic } from '@/lib/format/cnic';
export { isSensitiveKey, redactPii, REDACTED } from '@/lib/privacy/redact';

/** "+923001234567" → "+92 300 •••4567" (staff lists; employers never see phones). */
export function maskPhone(phone: string): string {
  const national = toNationalMobileDigits(phone);
  if (national.length !== 10) return '•••';
  return `+92 ${national.slice(0, 3)} •••${national.slice(6)}`;
}

/** "ayesha.khan@gmail.com" → "a•••n@gmail.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '•••';
  if (local.length <= 2) return `${local[0]}•••@${domain}`;
  return `${local[0]}•••${local[local.length - 1]}@${domain}`;
}

export const AGE_BANDS = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function ageInYears(dateOfBirth: Date | string, today: Date = new Date()): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dob.getUTCMonth() ||
    (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Employer-facing age (PRD rule 3): a band, never the date of birth. */
export function ageBand(dateOfBirth: Date | string, today: Date = new Date()): AgeBand {
  const age = ageInYears(dateOfBirth, today);
  if (age < 18) return 'Under 18';
  if (age <= 24) return '18–24';
  if (age <= 34) return '25–34';
  if (age <= 44) return '35–44';
  if (age <= 54) return '45–54';
  return '55+';
}

/** "Muhammad Ahmed Raza" → "Muhammad R." (first name + last initial). */
export function maskFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

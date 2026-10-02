/** Pakistani CNIC: 13 digits shown as #####-#######-#. Stored without dashes. */

export const CNIC_LENGTH = 13;

export function cnicDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, CNIC_LENGTH);
}

/** Progressive formatting while typing: "4210112345671" → "42101-1234567-1". */
export function formatCnic(input: string): string {
  const d = cnicDigits(input);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export function isValidCnic(input: string): boolean {
  return /^\d{13}$/.test(input.replace(/-/g, '')) && /^\d{5}-?\d{7}-?\d$/.test(input);
}

/** Masked for display to staff lists: "42101-•••••••-1". Never shown to employers at all. */
export function maskCnic(input: string): string {
  const d = cnicDigits(input);
  return d.length === CNIC_LENGTH ? `${d.slice(0, 5)}-•••••••-${d.slice(12)}` : '•••••-•••••••-•';
}

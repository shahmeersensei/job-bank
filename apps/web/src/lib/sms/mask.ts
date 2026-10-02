/** "+923001234567" → "+92300***4567" for log lines. */
export function maskPhoneForLog(phone: string): string {
  return phone.length > 8 ? `${phone.slice(0, 6)}***${phone.slice(-4)}` : '***';
}

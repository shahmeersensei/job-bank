import { locale } from '@/design-system/tokens';

/*
 * Every date is formatted in a fixed zone (Asia/Karachi) so server-rendered and
 * client-rendered text match exactly (no hydration mismatch) and users see local time.
 */

const dateTimeFormat = new Intl.DateTimeFormat(locale.language, {
  timeZone: locale.timeZone,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat(locale.language, {
  timeZone: locale.timeZone,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

/** "1 Oct 2026, 5:30 pm" */
export function formatDateTime(value: Date | string): string {
  return dateTimeFormat.format(toDate(value));
}

/** "1 Oct 2026" */
export function formatDate(value: Date | string): string {
  return dateFormat.format(toDate(value));
}

/** ISO string for <time dateTime>. */
export function toIso(value: Date | string): string {
  return toDate(value).toISOString();
}

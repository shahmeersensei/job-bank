'use client';

import { CalendarDays, Clock } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import type { DateTimeMode, DateTimePickerProps } from './dateTimePicker.types';

const inputType: Record<DateTimeMode, string> = {
  date: 'date',
  datetime: 'datetime-local',
  time: 'time',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Converts a Date to the local value a native date/time input expects. */
export function toInputValue(date: Date, mode: DateTimeMode = 'datetime'): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (mode === 'date') return day;
  if (mode === 'time') return time;
  return `${day}T${time}`;
}

/**
 * Native date/time inputs: accessible by default and they open the platform picker on
 * phones, which matters for the applicant audience. Values are local wall-clock strings.
 */
export function DateTimePicker({
  mode = 'datetime',
  value,
  onChange,
  ...props
}: DateTimePickerProps) {
  return (
    <Input
      type={inputType[mode]}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      startAdornment={
        mode === 'time' ? <Clock aria-hidden="true" /> : <CalendarDays aria-hidden="true" />
      }
      className="[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60"
      {...props}
    />
  );
}

'use client';

import { IdCard } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { CNIC_LENGTH, cnicDigits, formatCnic } from '@/lib/format/cnic';
import type { CNICInputProps } from './cnicInput.types';

export function CNICInput({
  value,
  onChange,
  placeholder = '42101-1234567-1',
  ...props
}: CNICInputProps) {
  const [internal, setInternal] = useState(() => cnicDigits(value ?? ''));
  const digits = value !== undefined ? cnicDigits(value) : internal;

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={15}
      placeholder={placeholder}
      value={formatCnic(digits)}
      onChange={(event) => {
        const next = cnicDigits(event.target.value);
        setInternal(next);
        onChange?.({
          digits: next,
          formatted: formatCnic(next),
          complete: next.length === CNIC_LENGTH,
        });
      }}
      startAdornment={<IdCard aria-hidden="true" />}
      className="numeric tracking-wide"
      {...props}
    />
  );
}

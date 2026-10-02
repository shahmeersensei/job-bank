'use client';

import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import {
  formatPkMobileNational,
  normalizePkMobile,
  toNationalMobileDigits,
} from '@/lib/format/phone';
import type { PhoneInputProps } from './phoneInput.types';

/** Pakistani mobile number input with a fixed +92 prefix ("300 1234567"). */
export function PhoneInput({
  value,
  onChange,
  placeholder = '300 1234567',
  ...props
}: PhoneInputProps) {
  const [internal, setInternal] = useState(() => toNationalMobileDigits(value ?? ''));
  const national = value !== undefined ? toNationalMobileDigits(value) : internal;

  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder={placeholder}
      value={formatPkMobileNational(national)}
      onChange={(event) => {
        const next = toNationalMobileDigits(event.target.value);
        setInternal(next);
        const e164 = normalizePkMobile(next);
        onChange?.({ e164, national: next, valid: e164 !== null });
      }}
      startAdornment={
        <span className="border-border text-fg-muted numeric border-e pe-2 text-sm font-medium">
          +92
        </span>
      }
      className="numeric"
      {...props}
    />
  );
}

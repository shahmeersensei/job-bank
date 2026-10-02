'use client';

import { RADIUS_LIMITS, type RadiusValue } from '@jobbank/shared';
import { Input } from '@/components/atoms';
import { FormField } from '@/components/molecules';

/** Kilometre strings as typed by the user (kept as text so "7." can be typed). */
export interface RadiusKm {
  preferredKm: string;
  maxKm: string;
}

export const toKm = (r: RadiusValue): RadiusKm => ({
  preferredKm: String(r.preferredM / 1000),
  maxKm: String(r.maxM / 1000),
});

export const toMeters = (r: RadiusKm): RadiusValue => ({
  preferredM: Math.round(Number(r.preferredKm) * 1000),
  maxM: Math.round(Number(r.maxKm) * 1000),
});

interface Props {
  value: RadiusKm;
  onChange: (value: RadiusKm) => void;
  errors?: { preferredM?: string; maxM?: string };
  /** Upper bound shown in the hint (the global max for overrides, 10 km for global). */
  maxAllowedM?: number;
  disabled?: boolean;
}

/** Preferred + maximum matching radius in km (PRD rule 4: hard ceiling 10 km). */
export function RadiusFields({
  value,
  onChange,
  errors = {},
  maxAllowedM = RADIUS_LIMITS.maxM,
  disabled,
}: Props) {
  const maxKm = maxAllowedM / 1000;
  const minKm = RADIUS_LIMITS.minM / 1000;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Preferred radius (km)"
        required
        hint="Matches inside this distance score highest."
        error={errors.preferredM}
        disabled={disabled}
      >
        <Input
          type="number"
          inputMode="decimal"
          min={minKm}
          max={maxKm}
          step={0.5}
          value={value.preferredKm}
          onChange={(e) => onChange({ ...value, preferredKm: e.target.value })}
          className="numeric"
          disabled={disabled}
        />
      </FormField>
      <FormField
        label="Maximum radius (km)"
        required
        hint={`No referral beyond this distance (${minKm}–${maxKm} km).`}
        error={errors.maxM}
        disabled={disabled}
      >
        <Input
          type="number"
          inputMode="decimal"
          min={minKm}
          max={maxKm}
          step={0.5}
          value={value.maxKm}
          onChange={(e) => onChange({ ...value, maxKm: e.target.value })}
          className="numeric"
          disabled={disabled}
        />
      </FormField>
    </div>
  );
}

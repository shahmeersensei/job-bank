'use client';

import { applicantLocationSchema } from '@jobbank/shared';
import { Building2, Lock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Input, RadioGroup, Select } from '@/components/atoms';
import { FormField } from '@/components/molecules';
import { MapPinPicker, type LatLng } from '@/components/organisms';
import type { ApplicantProfile } from '@/domains/applicant';
import type { BranchOption } from '@/domains/branch';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { formatDistance } from '@/lib/format/distance';
import {
  errorMessage,
  toFieldErrors,
  zodFieldErrors,
  type FieldErrors,
} from '../../_components/applicants/form';
import { useStepSave, type StepProps } from './step';

export function LocationStep({ profile, lists, bindSave }: StepProps) {
  const address = profile?.address;
  const locked = profile?.branchLocked ?? false;
  const [pin, setPin] = useState<LatLng | null>(address?.location ?? null);
  const [form, setForm] = useState({
    addressLine: address?.addressLine ?? '',
    cityCode: address?.cityCode ?? '',
    areaCode: address?.areaCode ?? '',
    branchId: profile?.branch?.id ?? '',
  });
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const set = (changes: Partial<typeof form>) => setForm((f) => ({ ...f, ...changes }));

  const areas = useMemo(
    () => lists.areas.filter((a) => a.cityCode === form.cityCode),
    [lists.areas, form.cityCode],
  );

  // Nearest branches for the pin; the closest is pre-selected until the applicant picks one.
  useEffect(() => {
    if (!pin || locked) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await apiFetch<BranchOption[]>(
          `/api/v1/applicants/me/branch-options?lat=${pin.lat}&lng=${pin.lng}`,
          { signal: controller.signal },
        );
        setBranches(data);
        setForm((f) =>
          f.branchId && data.some((b) => b.id === f.branchId) && f.branchId !== data[0]?.id
            ? f
            : { ...f, branchId: data[0]?.id ?? '' },
        );
      } catch {
        // Aborted or offline: the list simply stays as it was.
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pin, locked]);

  useStepSave(bindSave, async () => {
    setAlert(null);
    const parsed = applicantLocationSchema.safeParse({
      location: pin ?? undefined,
      addressLine: form.addressLine,
      cityCode: form.cityCode || undefined,
      areaCode: form.areaCode || null,
      branchId: form.branchId || undefined,
    });
    if (!parsed.success) {
      const next = zodFieldErrors(parsed.error);
      if (!pin) next.location = 'Tap your home on the map';
      setErrors(next);
      return null;
    }
    setErrors({});
    try {
      const { data } = await apiFetch<ApplicantProfile>('/api/v1/applicants/me/location', {
        method: 'PUT',
        body: parsed.data,
      });
      return data;
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0)
        setErrors(toFieldErrors(err.issues));
      else setAlert(errorMessage(err));
      return null;
    }
  });

  const pinError = errors.location ?? errors['location.lat'] ?? errors['location.lng'];

  return (
    <div className="grid gap-5">
      {alert && (
        <p role="alert" className="bg-danger-soft text-danger-soft-fg rounded-lg px-4 py-3 text-sm">
          {alert}
        </p>
      )}

      <div className="grid gap-2">
        <p className="text-fg text-sm font-medium">
          Your home on the map <span className="text-danger">*</span>
        </p>
        <MapPinPicker value={pin} onChange={setPin} label="Your home location" height="18rem" />
        {pinError && (
          <p role="alert" className="text-danger text-sm">
            {pinError}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Address"
          required
          error={errors.addressLine}
          hint="House, street and block. Only Job Bank staff can see it."
          className="sm:col-span-2"
        >
          <Input
            autoComplete="street-address"
            value={form.addressLine}
            onChange={(e) => set({ addressLine: e.target.value })}
          />
        </FormField>
        <FormField label="City" required error={errors.cityCode}>
          <Select
            placeholder="Choose your city"
            value={form.cityCode}
            onChange={(e) => set({ cityCode: e.target.value, areaCode: '' })}
            options={lists.cities}
          />
        </FormField>
        <FormField label="Area" error={errors.areaCode}>
          <Select
            placeholder={areas.length ? 'Choose your area' : 'No areas listed for this city'}
            value={form.areaCode}
            disabled={areas.length === 0}
            onChange={(e) => set({ areaCode: e.target.value })}
            options={areas}
          />
        </FormField>
      </div>

      <div className="grid gap-2">
        <p className="text-fg text-sm font-medium">
          Your Job Bank branch <span className="text-danger">*</span>
        </p>
        {locked && profile?.branch ? (
          <div className="bg-surface-muted grid gap-1 rounded-lg px-4 py-3 text-sm">
            <p className="text-fg flex items-center gap-2 font-medium">
              <Building2 className="size-4" aria-hidden="true" /> {profile.branch.name}
            </p>
            <p className="text-fg-muted flex items-start gap-2">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Your profile is active, so only branch staff can move you to another branch.
            </p>
          </div>
        ) : !pin ? (
          <p className="text-fg-muted text-sm">
            Place your pin first — we will suggest the nearest branch.
          </p>
        ) : branches.length === 0 ? (
          <p className="text-fg-muted text-sm">Finding branches near you…</p>
        ) : (
          <RadioGroup
            aria-label="Your Job Bank branch"
            value={form.branchId}
            onValueChange={(branchId) => set({ branchId })}
            options={branches.map((b, index) => ({
              value: b.id,
              label: (
                <span className="flex flex-wrap items-center gap-2">
                  {b.name}
                  {index === 0 && (
                    <Badge tone="success" size="sm">
                      Nearest
                    </Badge>
                  )}
                </span>
              ),
              description: [
                b.distanceM !== null ? `${formatDistance(b.distanceM)} away` : null,
                b.address,
              ]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        )}
        {errors.branchId && (
          <p role="alert" className="text-danger text-sm">
            {errors.branchId}
          </p>
        )}
      </div>
    </div>
  );
}

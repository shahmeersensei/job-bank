'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import type { RadiusValue } from '@jobbank/shared';
import { Button, Input, Switch } from '@/components/atoms';
import { FormField, toast } from '@/components/molecules';
import { MapPinPicker, type LatLng } from '@/components/organisms';
import type { BranchView } from '@/domains/branch';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { formatDistance } from '@/lib/format/distance';
import { RadiusFields, toKm, toMeters, type RadiusKm } from '../settings/RadiusFields';

interface Props {
  branch?: BranchView;
  /** The global matching radius: the default, and the ceiling for a branch's own radius. */
  globalRadius: RadiusValue;
}

/** Create (no `branch`) or edit a branch. The code is fixed once created. */
export function BranchForm({ branch, globalRadius }: Props) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [values, setValues] = useState({
    code: branch?.code ?? '',
    name: branch?.name ?? '',
    city: branch?.city ?? '',
    address: branch?.address ?? '',
    phone: branch?.phone ?? '',
  });
  const hadOwnRadius = branch?.matchRadius.source === 'BRANCH';
  const [ownRadius, setOwnRadius] = useState(hadOwnRadius);
  const [radius, setRadius] = useState<RadiusKm>(toKm(branch?.matchRadius ?? globalRadius));
  const [location, setLocation] = useState<LatLng | null>(branch?.location ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!location) {
      setErrors({ location: 'Place the branch on the map' });
      return;
    }
    setPending(true);
    setErrors({});
    const body = {
      ...(branch ? {} : { code: values.code }),
      name: values.name,
      city: values.city,
      address: values.address || null,
      phone: values.phone || null,
      location,
      // Own radius → write it; switched back to global → remove the branch policy.
      ...(ownRadius
        ? { matchRadius: toMeters(radius) }
        : hadOwnRadius
          ? { matchRadius: null }
          : {}),
    };
    try {
      const { data } = branch
        ? await apiFetch<BranchView>(`/api/v1/branches/${branch.id}`, { method: 'PATCH', body })
        : await apiFetch<BranchView>('/api/v1/branches', {
            method: 'POST',
            body,
            idempotencyKey: idempotencyKey.current,
          });
      toast.success(branch ? 'Branch updated' : `Branch ${data.code} created`);
      if (branch) {
        // Same page: refresh the data and keep the form usable for further edits.
        setPending(false);
        router.refresh();
      } else {
        router.push(`/super-admin/branches/${data.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
        if (!err.issues.length) toast.error(err.message);
      } else toast.error('Could not save the branch');
      setPending(false);
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Branch code"
          required
          hint={branch ? 'Codes cannot change.' : 'e.g. KHI-GULSHAN — used in candidate codes.'}
          error={errors.code}
        >
          <Input
            value={values.code}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
            disabled={Boolean(branch)}
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="Name" required error={errors.name}>
          <Input value={values.name} onChange={set('name')} />
        </FormField>
        <FormField label="City" required error={errors.city}>
          <Input value={values.city} onChange={set('city')} />
        </FormField>
        <FormField label="Phone" error={errors.phone}>
          <Input type="tel" value={values.phone} onChange={set('phone')} />
        </FormField>
        <FormField label="Address" error={errors.address} className="sm:col-span-2">
          <Input value={values.address} onChange={set('address')} />
        </FormField>
      </div>
      <fieldset className="border-border grid gap-4 rounded-lg border p-4">
        <legend className="text-fg px-1 text-sm font-medium">Matching radius</legend>
        <Switch
          checked={ownRadius}
          onCheckedChange={setOwnRadius}
          label="Use a branch-specific radius"
          description={`Off: follows the global radius (${formatDistance(globalRadius.preferredM)} preferred, ${formatDistance(globalRadius.maxM)} max).`}
        />
        {ownRadius && (
          <RadiusFields
            value={radius}
            onChange={setRadius}
            maxAllowedM={globalRadius.maxM}
            errors={{
              preferredM: errors['matchRadius.preferredM'],
              maxM: errors['matchRadius.maxM'] ?? errors.maxM,
            }}
          />
        )}
      </fieldset>
      <div className="grid gap-2">
        <p className="text-fg text-sm font-medium">
          Location{' '}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </p>
        <MapPinPicker
          value={location}
          onChange={setLocation}
          label="Branch location"
          height="18rem"
          rings={
            location
              ? [
                  {
                    meters:
                      (ownRadius ? toMeters(radius).maxM : globalRadius.maxM) || globalRadius.maxM,
                    tone: 'info',
                    label: 'Maximum matching radius',
                  },
                ]
              : []
          }
        />
        {errors.location && (
          <p role="alert" className="text-danger text-sm">
            {errors.location}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {branch ? 'Save changes' : 'Create branch'}
        </Button>
        <Button variant="secondary" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

'use client';

import type { RadiusValue, ResolvedRadius } from '@jobbank/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Switch } from '@/components/atoms';
import { toast } from '@/components/molecules';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { formatDistance } from '@/lib/format/distance';
import { RadiusFields, toKm, toMeters, type RadiusKm } from './RadiusFields';

interface Props {
  branchId: string;
  radius: ResolvedRadius;
  global: RadiusValue;
}

/** Branch Admin: give the branch its own radius (within the global max), or follow global. */
export function BranchRadiusForm({ branchId, radius, global }: Props) {
  const router = useRouter();
  const hadOwn = radius.source === 'BRANCH';
  const [own, setOwn] = useState(hadOwn);
  const [value, setValue] = useState<RadiusKm>(toKm(radius));
  const [errors, setErrors] = useState<{ preferredM?: string; maxM?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  const meters = toMeters(value);
  const dirty = own
    ? !hadOwn || meters.preferredM !== radius.preferredM || meters.maxM !== radius.maxM
    : hadOwn;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    try {
      await apiFetch(`/api/v1/radius-policies/branches/${branchId}`, {
        method: own ? 'PUT' : 'DELETE',
        body: own ? meters : undefined,
      });
      toast.success(own ? 'Branch radius saved' : 'The branch now follows the global radius');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length) {
        setErrors({ preferredM: err.issueFor('preferredM'), maxM: err.issueFor('maxM') });
      } else setErrors({ form: err instanceof Error ? err.message : 'Could not save the radius' });
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <Switch
        checked={own}
        onCheckedChange={setOwn}
        label="Use a branch-specific radius"
        description={`Off: follows the global radius (${formatDistance(global.preferredM)} preferred, ${formatDistance(global.maxM)} max).`}
      />
      {own && (
        <RadiusFields value={value} onChange={setValue} errors={errors} maxAllowedM={global.maxM} />
      )}
      {errors.form && (
        <p role="alert" className="bg-danger-soft text-danger-soft-fg rounded-lg px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}
      <div>
        <Button type="submit" loading={pending} disabled={!dirty}>
          Save radius
        </Button>
      </div>
    </form>
  );
}

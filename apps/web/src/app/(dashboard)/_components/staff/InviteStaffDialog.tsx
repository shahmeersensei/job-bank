'use client';

import { BRANCH_SCOPED_ROLES, ROLE_LABELS, type Role } from '@jobbank/shared';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/components/atoms';
import { FormField, Modal, toast } from '@/components/molecules';
import { ApiClientError, apiFetch } from '@/lib/api/client';

export interface BranchOption {
  id: string;
  name: string;
}

interface Props {
  grantableRoles: Role[];
  branches: BranchOption[];
  basePath: string;
}

export function InviteStaffDialog({ grantableRoles, branches, basePath }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    name: '',
    email: '',
    title: '',
    role: grantableRoles.at(-1) ?? 'STAFF',
    branchId: branches.length === 1 ? branches[0]!.id : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const scoped = BRANCH_SCOPED_ROLES.includes(form.role as Role);

  const reset = () => {
    setKey(crypto.randomUUID());
    setErrors({});
    setForm({
      name: '',
      email: '',
      title: '',
      role: grantableRoles.at(-1) ?? 'STAFF',
      branchId: branches.length === 1 ? branches[0]!.id : '',
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    try {
      const { data } = await apiFetch<{ user: { id: string; name: string }; emailSent: boolean }>(
        '/api/v1/users',
        {
          method: 'POST',
          idempotencyKey: key,
          body: {
            name: form.name,
            email: form.email,
            title: form.title || null,
            role: form.role,
            branchId: scoped ? form.branchId || null : null,
          },
        },
      );
      if (data.emailSent) toast.success(`Invitation sent to ${data.user.name}`);
      else
        toast.warning(
          'Account created, but the email could not be sent. Resend it from their page.',
        );
      setOpen(false);
      reset();
      router.push(`${basePath}/${data.user.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
        if (!err.issues.length) setErrors({ form: err.message });
      } else setErrors({ form: 'Could not send the invitation' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title="Invite staff member"
      description="They will get an email with a link to set their password. The link expires in 7 days."
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      trigger={
        <Button leftIcon={<UserPlus />} className="ms-auto">
          Invite staff
        </Button>
      }
    >
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <FormField label="Full name" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </FormField>
        <FormField label="Work email" required error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
        <FormField label="Job title" hint="Optional, e.g. Placement Officer" error={errors.title}>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role" required error={errors.role}>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              options={grantableRoles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
            />
          </FormField>
          {scoped && (
            <FormField label="Branch" required error={errors.branchId}>
              <Select
                value={form.branchId}
                placeholder="Choose a branch"
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </FormField>
          )}
        </div>
        {errors.form && (
          <p
            role="alert"
            className="bg-danger-soft text-danger-soft-fg rounded-lg px-3 py-2 text-sm"
          >
            {errors.form}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={pending}
            disabled={!form.name || !form.email || (scoped && !form.branchId)}
          >
            Send invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

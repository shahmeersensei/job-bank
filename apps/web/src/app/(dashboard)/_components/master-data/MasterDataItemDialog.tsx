'use client';

import {
  DOCUMENT_MIME_TYPES,
  MASTER_DATA_PARENT,
  PROVINCE_LABELS,
  PROVINCES,
  suggestMasterDataCode,
  type MasterDataItem,
  type MasterDataType,
} from '@jobbank/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactElement } from 'react';
import { Button, Checkbox, Input, Select, Switch, Textarea } from '@/components/atoms';
import { FormField, Modal, toast } from '@/components/molecules';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { isReasonType, MIME_LABELS, TYPE_SINGULAR } from './labels';

export interface ParentOption {
  id: string;
  label: string;
}

interface Props {
  type: MasterDataType;
  /** Omit to create a new item. */
  item?: MasterDataItem;
  parents: ParentOption[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Meta = Record<string, unknown>;

function initialMeta(type: MasterDataType, meta: Meta | undefined): Meta {
  if (meta && Object.keys(meta).length > 0) return meta;
  switch (type) {
    case 'EDUCATION_LEVEL':
      return { rank: 0 };
    case 'CITY':
      return { province: 'SINDH' };
    case 'DOCUMENT_TYPE':
      return {
        appliesTo: 'APPLICANT',
        required: false,
        mimeTypes: [...DOCUMENT_MIME_TYPES],
        maxSizeMb: 5,
      };
    case 'BLACKLIST_REASON':
      return { requiresNote: false, appliesTo: ['APPLICANT', 'COMPANY'] };
    default:
      return isReasonType(type) ? { requiresNote: false } : {};
  }
}

const toggle = (list: unknown, value: string, on: boolean): string[] => {
  const current = Array.isArray(list) ? (list as string[]) : [];
  return on ? [...new Set([...current, value])] : current.filter((v) => v !== value);
};

/** Create or edit one master-data item. Code and type are fixed once created. */
export function MasterDataItemDialog({ type, item, parents, trigger, open, onOpenChange }: Props) {
  const router = useRouter();
  const editing = Boolean(item);
  const parentRule = MASTER_DATA_PARENT[type];
  const fresh = () => ({
    label: item?.label ?? '',
    code: item?.code ?? '',
    description: item?.description ?? '',
    parentId: item?.parentId ?? '',
    sortOrder: String(item?.sortOrder ?? 0),
    isActive: item?.isActive ?? true,
  });
  const [form, setForm] = useState(fresh);
  const [meta, setMeta] = useState<Meta>(() => initialMeta(type, item?.meta));
  const [codeTouched, setCodeTouched] = useState(editing);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setForm(fresh());
      setMeta(initialMeta(type, item?.meta));
      setCodeTouched(editing);
      setErrors({});
      setKey(crypto.randomUUID());
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    const body = {
      label: form.label,
      description: form.description || null,
      ...(parentRule ? { parentId: form.parentId || null } : {}),
      sortOrder: Number(form.sortOrder) || 0,
      meta,
    };
    try {
      if (item) {
        await apiFetch(`/api/v1/master-data/${item.id}`, {
          method: 'PATCH',
          body: { ...body, isActive: form.isActive },
        });
        toast.success(`${form.label} saved`);
      } else {
        await apiFetch('/api/v1/master-data', {
          method: 'POST',
          idempotencyKey: key,
          body: { ...body, type, code: form.code },
        });
        toast.success(`${form.label} added`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
        if (!err.issues.length) setErrors({ form: err.message });
      } else setErrors({ form: 'Could not save the item' });
    } finally {
      setPending(false);
    }
  };

  const metaField = (name: string) => errors[`meta.${name}`] ?? errors[`meta.${name}.0`];

  return (
    <Modal
      title={item ? `Edit ${TYPE_SINGULAR[type]}` : `Add ${TYPE_SINGULAR[type]}`}
      description={
        item
          ? 'The code cannot change, because other records store it.'
          : 'Choose the code carefully: it is permanent.'
      }
      open={isOpen}
      onOpenChange={setOpen}
      trigger={trigger}
    >
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <FormField label="Label" required error={errors.label}>
          <Input
            value={form.label}
            autoFocus
            onChange={(e) => {
              const label = e.target.value;
              setForm((f) => ({
                ...f,
                label,
                code: codeTouched ? f.code : suggestMasterDataCode(label),
              }));
            }}
          />
        </FormField>
        <FormField
          label="Code"
          required
          hint={editing ? 'Permanent.' : 'Capital letters, digits and underscores.'}
          error={errors.code}
        >
          <Input
            value={form.code}
            disabled={editing}
            className="font-mono uppercase"
            onChange={(e) => {
              setCodeTouched(true);
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
            }}
          />
        </FormField>

        {parentRule && (
          <FormField
            label={parentRule.type === 'CITY' ? 'City' : 'Job category'}
            required={parentRule.required}
            error={errors.parentId}
          >
            <Select
              value={form.parentId}
              placeholder={parentRule.required ? 'Choose…' : 'None'}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              options={parents.map((p) => ({ value: p.id, label: p.label }))}
            />
          </FormField>
        )}

        {type === 'EDUCATION_LEVEL' && (
          <FormField
            label="Rank"
            required
            hint="Higher = more education. Used for “minimum education” in matching."
            error={metaField('rank')}
          >
            <Input
              type="number"
              min={0}
              max={20}
              className="numeric"
              value={String(meta.rank ?? 0)}
              onChange={(e) => setMeta((m) => ({ ...m, rank: Number(e.target.value) }))}
            />
          </FormField>
        )}

        {type === 'CITY' && (
          <FormField label="Province" required error={metaField('province')}>
            <Select
              value={String(meta.province ?? '')}
              onChange={(e) => setMeta((m) => ({ ...m, province: e.target.value }))}
              options={PROVINCES.map((p) => ({ value: p, label: PROVINCE_LABELS[p] }))}
            />
          </FormField>
        )}

        {type === 'DOCUMENT_TYPE' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Uploaded by" required error={metaField('appliesTo')}>
                <Select
                  value={String(meta.appliesTo)}
                  onChange={(e) => setMeta((m) => ({ ...m, appliesTo: e.target.value }))}
                  options={[
                    { value: 'APPLICANT', label: 'Applicants' },
                    { value: 'COMPANY', label: 'Companies' },
                  ]}
                />
              </FormField>
              <FormField label="Maximum size (MB)" required error={metaField('maxSizeMb')}>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="numeric"
                  value={String(meta.maxSizeMb ?? 5)}
                  onChange={(e) => setMeta((m) => ({ ...m, maxSizeMb: Number(e.target.value) }))}
                />
              </FormField>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-fg mb-1 text-sm font-medium">Allowed file types</legend>
              <div className="flex flex-wrap gap-4">
                {DOCUMENT_MIME_TYPES.map((mime) => (
                  <Checkbox
                    key={mime}
                    label={MIME_LABELS[mime]}
                    checked={Array.isArray(meta.mimeTypes) && meta.mimeTypes.includes(mime)}
                    onCheckedChange={(on) =>
                      setMeta((m) => ({ ...m, mimeTypes: toggle(m.mimeTypes, mime, on === true) }))
                    }
                  />
                ))}
              </div>
              {metaField('mimeTypes') && (
                <p role="alert" className="text-danger text-sm">
                  Choose at least one file type
                </p>
              )}
            </fieldset>
            <Switch
              label="Required"
              description="Profiles cannot be submitted without this document."
              checked={meta.required === true}
              onCheckedChange={(on) => setMeta((m) => ({ ...m, required: on }))}
            />
          </>
        )}

        {type === 'BLACKLIST_REASON' && (
          <fieldset className="grid gap-2">
            <legend className="text-fg mb-1 text-sm font-medium">Can be used for</legend>
            <div className="flex flex-wrap gap-4">
              {(['APPLICANT', 'COMPANY'] as const).map((subject) => (
                <Checkbox
                  key={subject}
                  label={subject === 'APPLICANT' ? 'Applicants' : 'Companies'}
                  checked={Array.isArray(meta.appliesTo) && meta.appliesTo.includes(subject)}
                  onCheckedChange={(on) =>
                    setMeta((m) => ({ ...m, appliesTo: toggle(m.appliesTo, subject, on === true) }))
                  }
                />
              ))}
            </div>
            {metaField('appliesTo') && (
              <p role="alert" className="text-danger text-sm">
                Choose at least one
              </p>
            )}
          </fieldset>
        )}

        {isReasonType(type) && (
          <Switch
            label="Note required"
            description="Whoever picks this reason must also write a short explanation."
            checked={meta.requiresNote === true}
            onCheckedChange={(on) => setMeta((m) => ({ ...m, requiresNote: on }))}
          />
        )}

        <FormField label="Description" hint="Optional help text." error={errors.description}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </FormField>
        <FormField
          label="Sort order"
          hint="Lower numbers are listed first."
          error={errors.sortOrder}
        >
          <Input
            type="number"
            min={0}
            className="numeric"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
        </FormField>
        {editing && (
          <Switch
            label="Active"
            description="Inactive items stay on old records but can no longer be chosen."
            checked={form.isActive}
            onCheckedChange={(on) => setForm((f) => ({ ...f, isActive: on }))}
          />
        )}

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
          <Button type="submit" loading={pending} disabled={!form.label || !form.code}>
            {item ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

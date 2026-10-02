'use client';

import type { RadiusValue, ResolvedRadius } from '@jobbank/shared';
import { AlertTriangle, Plus, Ruler } from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Select } from '@/components/atoms';
import { ConfirmDialog, EmptyState, FormField, Modal, toast } from '@/components/molecules';
import { DataTable } from '@/components/organisms';
import type { RadiusOverview, RadiusPolicyView } from '@/domains/settings';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { formatDistance } from '@/lib/format/distance';
import { RadiusFields, toKm, toMeters, type RadiusKm } from './RadiusFields';

interface Option {
  id: string;
  label: string;
}

const pair = (r: RadiusValue) => `${formatDistance(r.preferredM)} / ${formatDistance(r.maxM)}`;

/** Field errors from a radius write, keyed for RadiusFields. */
function radiusErrors(err: unknown): { preferredM?: string; maxM?: string; form?: string } {
  if (!(err instanceof ApiClientError)) return { form: 'Could not save the radius' };
  if (!err.issues.length) return { form: err.message };
  return {
    preferredM: err.issueFor('preferredM'),
    maxM: err.issueFor('maxM') ?? err.issueFor('(root)'),
  };
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-danger-soft text-danger-soft-fg rounded-lg px-3 py-2 text-sm">
      {message}
    </p>
  );
}

// ─── Global ───────────────────────────────────────────────────────────

function GlobalRadiusForm({ global }: { global: RadiusValue }) {
  const router = useRouter();
  const [value, setValue] = useState<RadiusKm>(toKm(global));
  const [errors, setErrors] = useState<ReturnType<typeof radiusErrors>>({});
  const [pending, setPending] = useState(false);
  const dirty =
    toMeters(value).preferredM !== global.preferredM || toMeters(value).maxM !== global.maxM;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    try {
      await apiFetch('/api/v1/radius-policies/global', { method: 'PUT', body: toMeters(value) });
      toast.success('Global radius saved');
      router.refresh();
    } catch (err) {
      setErrors(radiusErrors(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <RadiusFields value={value} onChange={setValue} errors={errors} />
      <FormError message={errors.form} />
      <div>
        <Button type="submit" loading={pending} disabled={!dirty}>
          Save global radius
        </Button>
      </div>
    </form>
  );
}

// ─── Category overrides ──────────────────────────────────────────────

function CategoryRadiusDialog({
  categories,
  policy,
  global,
  onClose,
}: {
  categories: Option[];
  policy: RadiusPolicyView | null;
  global: RadiusValue;
  onClose: () => void;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(policy?.categoryId ?? '');
  const [value, setValue] = useState<RadiusKm>(toKm(policy ?? global));
  const [errors, setErrors] = useState<ReturnType<typeof radiusErrors> & { categoryId?: string }>(
    {},
  );
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoryId) {
      setErrors({ categoryId: 'Choose a job category' });
      return;
    }
    setPending(true);
    setErrors({});
    try {
      await apiFetch(`/api/v1/radius-policies/categories/${categoryId}`, {
        method: 'PUT',
        body: toMeters(value),
      });
      toast.success('Category radius saved');
      onClose();
      router.refresh();
    } catch (err) {
      setErrors(radiusErrors(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={policy ? `Radius for ${policy.label}` : 'Add a category radius'}
      description={`Overrides branch and global radius for jobs in this category. Must stay within the global maximum (${formatDistance(global.maxM)}).`}
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {!policy && (
          <FormField label="Job category" required error={errors.categoryId}>
            <Select
              value={categoryId}
              placeholder="Choose…"
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.label }))}
            />
          </FormField>
        )}
        <RadiusFields value={value} onChange={setValue} errors={errors} maxAllowedM={global.maxM} />
        <FormError message={errors.form} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CapWarning({ policy, global }: { policy: RadiusValue; global: RadiusValue }) {
  if (policy.maxM <= global.maxM) return null;
  return (
    <span className="text-warning-soft-fg inline-flex items-center gap-1 text-xs">
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      Capped at {formatDistance(global.maxM)} (global max)
    </span>
  );
}

function CategoryOverrides({
  overview,
  categories,
}: {
  overview: RadiusOverview;
  categories: Option[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ policy: RadiusPolicyView | null } | null>(null);
  const used = new Set(overview.categories.map((c) => c.categoryId));
  const available = categories.filter((c) => !used.has(c.id));

  const remove = async (policy: RadiusPolicyView) => {
    try {
      await apiFetch(`/api/v1/radius-policies/categories/${policy.categoryId}`, {
        method: 'DELETE',
      });
      toast.success(`${policy.label} now follows branch and global radius`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the override');
    }
  };

  return (
    <>
      <DataTable<RadiusPolicyView>
        caption="Category radius overrides"
        rows={overview.categories}
        getRowId={(p) => p.id}
        toolbar={
          <Button
            leftIcon={<Plus />}
            variant="secondary"
            className="ms-auto"
            disabled={available.length === 0}
            onClick={() => setDialog({ policy: null })}
          >
            Add category radius
          </Button>
        }
        empty={
          <EmptyState
            compact
            icon={Ruler}
            title="No category overrides"
            description="Every category follows the branch or global radius."
          />
        }
        columns={[
          { id: 'category', header: 'Job category', cell: (p) => p.label },
          {
            id: 'radius',
            header: 'Preferred / max',
            cell: (p) => (
              <div className="grid">
                <span className="numeric">{pair(p)}</span>
                <CapWarning policy={p} global={overview.global} />
              </div>
            ),
          },
          {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'end',
            cell: (p) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDialog({ policy: p })}>
                  Edit
                </Button>
                <ConfirmDialog
                  title={`Remove the radius for ${p.label}?`}
                  description="Jobs in this category will follow their branch or the global radius."
                  confirmLabel="Remove"
                  tone="danger"
                  onConfirm={() => remove(p)}
                  trigger={
                    <Button size="sm" variant="ghost">
                      Remove
                    </Button>
                  }
                />
              </div>
            ),
          },
        ]}
      />
      {dialog && (
        <CategoryRadiusDialog
          categories={available}
          policy={dialog.policy}
          global={overview.global}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<ResolvedRadius['source'], string> = {
  JOB: 'the job',
  CATEGORY: 'the category override',
  BRANCH: 'the branch override',
  GLOBAL: 'the global radius',
  DEFAULT: 'the built-in default',
};

function RadiusPreview({
  branches,
  categories,
  revision,
}: {
  branches: Option[];
  categories: Option[];
  /** Changes whenever any policy changes, so the preview re-resolves after a save. */
  revision: string;
}) {
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [result, setResult] = useState<ResolvedRadius | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (branchId) query.set('branchId', branchId);
    if (categoryId) query.set('categoryId', categoryId);
    apiFetch<ResolvedRadius>(`/api/v1/radius-policies/resolve?${query}`, {
      signal: controller.signal,
    })
      .then(({ data }) => setResult(data))
      .catch(() => {});
    return () => controller.abort();
  }, [branchId, categoryId, revision]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Branch">
          <Select
            value={branchId}
            placeholder="Any branch"
            onChange={(e) => setBranchId(e.target.value)}
            options={branches.map((b) => ({ value: b.id, label: b.label }))}
          />
        </FormField>
        <FormField label="Job category">
          <Select
            value={categoryId}
            placeholder="Any category"
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.label }))}
          />
        </FormField>
      </div>
      <p aria-live="polite" className="bg-surface-muted text-fg rounded-lg px-4 py-3 text-sm">
        {result ? (
          <>
            A job here matches within{' '}
            <strong className="numeric">{formatDistance(result.preferredM)}</strong> (preferred) and
            never beyond <strong className="numeric">{formatDistance(result.maxM)}</strong>, from{' '}
            {SOURCE_LABEL[result.source]}
            {result.capped && ', capped at the global maximum'}.
          </>
        ) : (
          'Working it out…'
        )}
      </p>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────

interface Props {
  overview: RadiusOverview;
  categories: Option[];
  branches: Option[];
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-surface shadow-card grid gap-4 rounded-xl border p-5">
      <div className="grid gap-1">
        <h3 className="text-fg text-base font-semibold">{title}</h3>
        <p className="text-fg-muted text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * PRD rule 4 on one page: the global radius, category and branch overrides, and a preview
 * of which radius applies (job → category → branch → global, capped by the global max).
 */
export function RadiusSettings({ overview, categories, branches }: Props) {
  return (
    <div className="grid gap-4">
      <Card
        title="Global radius"
        description="Applies everywhere unless a branch or job category has its own radius. Never more than 10 km."
      >
        <GlobalRadiusForm global={overview.global} />
      </Card>
      <Card
        title="Job category overrides"
        description="Some trades need a different distance. A category radius wins over the branch radius."
      >
        <CategoryOverrides overview={overview} categories={categories} />
      </Card>
      <Card
        title="Branch overrides"
        description="Set on each branch's page, or by its Branch Admin under Branch settings."
      >
        {overview.branches.length === 0 ? (
          <p className="text-fg-muted text-sm">Every branch follows the global radius.</p>
        ) : (
          <ul className="divide-border grid divide-y">
            {overview.branches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <NextLink
                  href={`/super-admin/branches/${b.branchId}`}
                  className="text-primary focus-visible:focus-ring rounded text-sm font-medium hover:underline"
                >
                  {b.label}
                </NextLink>
                <span className="grid justify-items-end">
                  <span className="numeric text-sm">{pair(b)}</span>
                  <CapWarning policy={b} global={overview.global} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card
        title="Which radius applies?"
        description="Pick a branch and a job category to see the radius matching will use."
      >
        <RadiusPreview
          branches={branches}
          categories={categories}
          revision={JSON.stringify(overview)}
        />
      </Card>
    </div>
  );
}

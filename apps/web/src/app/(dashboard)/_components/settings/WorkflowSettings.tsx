'use client';

import { WEEKDAY_LABELS, type SettingKey } from '@jobbank/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Checkbox, Input, Switch } from '@/components/atoms';
import { FormField, toast } from '@/components/molecules';
import type { SettingView } from '@/domains/settings';
import { ApiClientError, apiFetch } from '@/lib/api/client';

/** Editors work on text so partial input ("7, 3") can be typed; converted on save. */
type Draft = string | boolean | number[];

function toDraft(setting: SettingView): Draft {
  const v = setting.value;
  if (typeof v === 'boolean') return v;
  if (setting.key === 'calendar.weekend_days') return v as number[];
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function fromDraft(key: SettingKey, draft: Draft): unknown {
  if (typeof draft === 'boolean') return draft;
  if (Array.isArray(draft)) return [...draft].sort((a, b) => a - b);
  if (key === 'placement.followup_days') {
    return draft
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((d) => (/^\d+$/.test(d) ? Number(d) : d));
  }
  return draft.trim() === '' ? null : Number(draft);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function describe(setting: SettingView): string {
  const v = setting.defaultValue;
  if (setting.key === 'calendar.weekend_days') {
    return (v as number[]).map((d) => WEEKDAY_LABELS[d]).join(', ') || 'none';
  }
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  return Array.isArray(v) ? v.join(', ') : String(v);
}

function SettingEditor({ setting }: { setting: SettingView }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(setting));
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const value = fromDraft(setting.key, draft);
  const dirty = !same(value, setting.value);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      await apiFetch(`/api/v1/settings/${setting.key}`, { method: 'PUT', body: { value } });
      toast.success(`${setting.label} saved`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? (err.issues[0]?.message ?? err.message)
          : 'Could not save the setting',
      );
    } finally {
      setPending(false);
    }
  };

  let control;
  if (typeof draft === 'boolean') {
    control = (
      <Switch
        label={draft ? 'On' : 'Off'}
        checked={draft}
        onCheckedChange={(on) => setDraft(on)}
        aria-describedby={`${setting.key}-desc`}
      />
    );
  } else if (Array.isArray(draft)) {
    control = (
      <fieldset className="grid gap-2">
        <legend className="sr-only">{setting.label}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {WEEKDAY_LABELS.map((day, index) => (
            <Checkbox
              key={day}
              label={day}
              checked={draft.includes(index)}
              onCheckedChange={(on) =>
                setDraft(on === true ? [...draft, index] : draft.filter((d) => d !== index))
              }
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </fieldset>
    );
  } else {
    const list = setting.key === 'placement.followup_days';
    control = (
      <FormField
        label={setting.unit ? `${setting.label} (${setting.unit})` : setting.label}
        hideLabel
        hint={
          list ? 'Separate the days with commas, e.g. 7, 30, 90, 180.' : (setting.unit ?? undefined)
        }
        error={error}
      >
        <Input
          value={draft}
          inputMode={list ? 'text' : 'numeric'}
          className={list ? 'numeric' : 'numeric w-28'}
          onChange={(e) => setDraft(e.target.value)}
        />
      </FormField>
    );
  }

  return (
    <form
      onSubmit={save}
      noValidate
      className="border-border grid gap-3 border-t py-4 first:border-t-0 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-fg text-sm font-semibold">{setting.label}</h3>
        {setting.isDefault ? (
          <Badge size="sm" tone="neutral">
            Default
          </Badge>
        ) : (
          <Badge size="sm" tone="info">
            Changed · default {describe(setting)}
          </Badge>
        )}
      </div>
      <p id={`${setting.key}-desc`} className="text-fg-muted -mt-2 text-sm">
        {setting.description}
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">{control}</div>
        <Button type="submit" size="sm" loading={pending} disabled={!dirty}>
          Save
        </Button>
      </div>
      {typeof draft === 'boolean' && error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

/** Global workflow settings, each saved (and audited) on its own. */
export function WorkflowSettings({ settings }: { settings: SettingView[] }) {
  return (
    <section className="border-border bg-surface shadow-card grid rounded-xl border p-5">
      {settings.map((setting) => (
        <SettingEditor key={`${setting.key}-${JSON.stringify(setting.value)}`} setting={setting} />
      ))}
    </section>
  );
}

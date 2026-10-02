'use client';

import {
  LANGUAGE_PROFICIENCIES,
  LANGUAGE_PROFICIENCY_LABELS,
  languagesSchema,
  SKILL_LEVEL_LABELS,
  SKILL_LEVELS,
  skillsSchema,
  type LanguageProficiency,
  type SkillLevel,
} from '@jobbank/shared';
import { useState } from 'react';
import { Input, Select } from '@/components/atoms';
import { FormField } from '@/components/molecules';
import type { ApplicantProfile } from '@/domains/applicant';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import {
  errorMessage,
  toFieldErrors,
  zodFieldErrors,
  type FieldErrors,
} from '../../_components/applicants/form';
import { RepeatableList } from './RepeatableList';
import { useStepSave, type StepProps } from './step';

interface SkillRow {
  skillCode: string;
  level: SkillLevel | '';
  years: string;
}
interface LanguageRow {
  languageCode: string;
  proficiency: LanguageProficiency | '';
}

const prefixed = (errors: FieldErrors, prefix: string): FieldErrors =>
  Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${prefix}.${k}`, v]));

export function SkillsStep({ profile, lists, bindSave }: StepProps) {
  const [skills, setSkills] = useState<SkillRow[]>(
    profile?.skills.map((s) => ({ ...s, years: String(s.years) })) ?? [],
  );
  const [languages, setLanguages] = useState<LanguageRow[]>(
    profile?.languages.length ? profile.languages : [{ languageCode: 'URDU', proficiency: '' }],
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);

  useStepSave(bindSave, async () => {
    setAlert(null);
    const s = skillsSchema.safeParse({
      items: skills.map((r) => ({
        skillCode: r.skillCode || undefined,
        level: r.level || undefined,
        years: r.years === '' ? 0 : Number(r.years),
      })),
    });
    const l = languagesSchema.safeParse({
      items: languages.map((r) => ({
        languageCode: r.languageCode || undefined,
        proficiency: r.proficiency || undefined,
      })),
    });
    if (!s.success || !l.success) {
      setErrors({
        ...(s.success ? {} : prefixed(zodFieldErrors(s.error), 'skills')),
        ...(l.success ? {} : prefixed(zodFieldErrors(l.error), 'languages')),
      });
      return null;
    }
    setErrors({});
    try {
      await apiFetch('/api/v1/applicants/me/skills', { method: 'PUT', body: s.data });
      const { data } = await apiFetch<ApplicantProfile>('/api/v1/applicants/me/languages', {
        method: 'PUT',
        body: l.data,
      });
      return data;
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0) {
        setErrors(prefixed(toFieldErrors(err.issues), 'skills'));
      } else setAlert(errorMessage(err));
      return null;
    }
  });

  const chosenSkills = new Set(skills.map((s) => s.skillCode));
  const chosenLanguages = new Set(languages.map((l) => l.languageCode));

  return (
    <div className="grid gap-6">
      {alert && (
        <p role="alert" className="bg-danger-soft text-danger-soft-fg rounded-lg px-4 py-3 text-sm">
          {alert}
        </p>
      )}
      <div className="grid gap-3">
        <div className="grid gap-1">
          <h3 className="text-fg text-base font-semibold">Skills</h3>
          <p className="text-fg-muted text-sm">
            Jobs are matched on these. Add everything you can do, even without a certificate.
          </p>
        </div>
        {errors['skills.items'] && (
          <p role="alert" className="text-danger text-sm">
            {errors['skills.items']}
          </p>
        )}
        <RepeatableList
          items={skills}
          onChange={setSkills}
          max={30}
          itemLabel={(i) => `Skill ${i + 1}`}
          addLabel={skills.length ? 'Add another skill' : 'Add a skill'}
          createItem={(): SkillRow => ({ skillCode: '', level: '', years: '' })}
          renderItem={(row, update, i) => (
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              <FormField label="Skill" required error={errors[`skills.items.${i}.skillCode`]}>
                <Select
                  placeholder="Choose a skill"
                  value={row.skillCode}
                  onChange={(e) => update({ skillCode: e.target.value })}
                  options={lists.skills.filter(
                    (o) => o.value === row.skillCode || !chosenSkills.has(o.value),
                  )}
                />
              </FormField>
              <FormField label="Level" required error={errors[`skills.items.${i}.level`]}>
                <Select
                  placeholder="Choose"
                  value={row.level}
                  onChange={(e) => update({ level: e.target.value as SkillLevel })}
                  options={SKILL_LEVELS.map((l) => ({ value: l, label: SKILL_LEVEL_LABELS[l] }))}
                />
              </FormField>
              <FormField label="Years" error={errors[`skills.items.${i}.years`]}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={50}
                  value={row.years}
                  onChange={(e) => update({ years: e.target.value })}
                />
              </FormField>
            </div>
          )}
        />
      </div>

      <div className="border-border grid gap-3 border-t pt-5">
        <h3 className="text-fg text-base font-semibold">Languages</h3>
        <RepeatableList
          items={languages}
          onChange={setLanguages}
          max={10}
          itemLabel={(i) => `Language ${i + 1}`}
          addLabel="Add a language"
          createItem={(): LanguageRow => ({ languageCode: '', proficiency: '' })}
          renderItem={(row, update, i) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Language"
                required
                error={errors[`languages.items.${i}.languageCode`]}
              >
                <Select
                  placeholder="Choose a language"
                  value={row.languageCode}
                  onChange={(e) => update({ languageCode: e.target.value })}
                  options={lists.languages.filter(
                    (o) => o.value === row.languageCode || !chosenLanguages.has(o.value),
                  )}
                />
              </FormField>
              <FormField
                label="How well?"
                required
                error={errors[`languages.items.${i}.proficiency`]}
              >
                <Select
                  placeholder="Choose"
                  value={row.proficiency}
                  onChange={(e) => update({ proficiency: e.target.value as LanguageProficiency })}
                  options={LANGUAGE_PROFICIENCIES.map((p) => ({
                    value: p,
                    label: LANGUAGE_PROFICIENCY_LABELS[p],
                  }))}
                />
              </FormField>
            </div>
          )}
        />
      </div>
    </div>
  );
}

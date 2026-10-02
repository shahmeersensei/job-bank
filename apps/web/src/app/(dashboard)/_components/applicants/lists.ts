import 'server-only';
import type { MasterDataType } from '@jobbank/shared';
import type { SelectOption } from '@/components/atoms';
import { listMasterData, masterDataLabels } from '@/domains/settings';
import type { Actor } from '@/domains/shared/scope';

/** Pick-lists for the applicant profile forms (active master data only). */
export interface ProfileLists {
  educationLevels: SelectOption[];
  /** Labelled with their category, e.g. "Electrician · Construction". */
  skills: SelectOption[];
  languages: SelectOption[];
  cities: SelectOption[];
  /** Areas carry their city code so the form can filter them. */
  areas: (SelectOption & { cityCode: string })[];
  categories: SelectOption[];
}

export async function profileLists(actor: Actor): Promise<ProfileLists> {
  const load = (type: MasterDataType) => listMasterData(actor, { type });
  const [levels, skills, languages, cities, areas, categories] = await Promise.all([
    load('EDUCATION_LEVEL'),
    load('SKILL'),
    load('LANGUAGE'),
    load('CITY'),
    load('AREA'),
    load('JOB_CATEGORY'),
  ]);
  const option = (item: { code: string; label: string }) => ({
    value: item.code,
    label: item.label,
  });
  const categoryById = new Map(categories.map((c) => [c.id, c.label]));
  const cityCodeById = new Map(cities.map((c) => [c.id, c.code]));
  return {
    educationLevels: levels.map(option),
    skills: skills
      .map((s) => ({
        value: s.code,
        label: s.parentId ? `${s.label} · ${categoryById.get(s.parentId) ?? ''}` : s.label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    languages: languages.map(option),
    cities: cities.map(option),
    areas: areas.flatMap((area) => {
      const cityCode = area.parentId ? cityCodeById.get(area.parentId) : undefined;
      return cityCode ? [{ ...option(area), cityCode }] : [];
    }),
    categories: categories.map(option),
  };
}

/** code → label maps for showing a saved profile (inactive codes keep their label). */
export type ProfileLabels = Record<
  'EDUCATION_LEVEL' | 'SKILL' | 'LANGUAGE' | 'CITY' | 'AREA' | 'JOB_CATEGORY' | 'DOCUMENT_TYPE',
  Record<string, string>
>;

export async function profileLabels(): Promise<ProfileLabels> {
  return (await masterDataLabels([
    'EDUCATION_LEVEL',
    'SKILL',
    'LANGUAGE',
    'CITY',
    'AREA',
    'JOB_CATEGORY',
    'DOCUMENT_TYPE',
  ])) as ProfileLabels;
}

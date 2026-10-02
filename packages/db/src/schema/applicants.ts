import {
  APPLICANT_DOCUMENT_STATUSES,
  APPLICANT_STATUSES,
  GENDERS,
  IDENTITY_METHODS,
  IDENTITY_OUTCOMES,
  IDENTITY_STATUSES,
  LANGUAGE_PROFICIENCIES,
  RADIUS_LIMITS,
  SKILL_LEVELS,
} from '@jobbank/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { geographyPoint } from '../types/geography';
import { branches } from './branches';
import { users } from './identity';

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

/**
 * M6: one profile per applicant account (phone sign-in). The phone number stays on `users`
 * (it is the sign-in identity). `branch_id` is chosen at the location step; a profile can only
 * be ACTIVE (matchable) with a branch. Master-data references store the permanent `code`.
 */
export const applicants = pgTable(
  'applicants',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'restrict' }),
    branchId: uuid().references(() => branches.id, { onDelete: 'restrict' }),
    fullName: text().notNull(),
    fatherName: text().notNull(),
    /** 13 digits, no dashes. Never sent to employers (PRD rule 3). */
    cnic: text().notNull().unique(),
    dateOfBirth: date({ mode: 'string' }).notNull(),
    gender: text({ enum: GENDERS }).notNull(),
    /** Optional contact email (the `users` row only has a placeholder). */
    email: text(),
    status: text({ enum: APPLICANT_STATUSES }).notNull().default('DRAFT'),
    /** Why staff deactivated the profile (shown to staff). */
    statusReason: text(),
    /** Current result of the staff identity check; history is in identity_verifications. */
    identityStatus: text({ enum: IDENTITY_STATUSES }).notNull().default('UNVERIFIED'),
    profileCompleteness: smallint().notNull().default(0),
    hasNoExperience: boolean().notNull().default(false),
    activatedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('applicants_branch_status_idx').on(t.branchId, t.status),
    check('applicants_cnic_format', sql`${t.cnic} ~ '^[1-9][0-9]{12}$'`),
    check('applicants_status_valid', sql`${t.status} in (${list(APPLICANT_STATUSES)})`),
    check(
      'applicants_identity_status_valid',
      sql`${t.identityStatus} in (${list(IDENTITY_STATUSES)})`,
    ),
    check('applicants_gender_valid', sql`${t.gender} in (${list(GENDERS)})`),
    check('applicants_completeness_range', sql`${t.profileCompleteness} between 0 and 100`),
    check(
      'applicants_active_needs_branch',
      sql`${t.status} = 'DRAFT' or ${t.branchId} is not null`,
    ),
  ],
);

/** The applicant's current home pin (one per applicant; changes are kept in the audit log). */
export const applicantAddresses = pgTable('applicant_addresses', {
  applicantId: uuid()
    .primaryKey()
    .references(() => applicants.id, { onDelete: 'cascade' }),
  addressLine: text().notNull(),
  cityCode: text().notNull(),
  areaCode: text(),
  location: geographyPoint().notNull(),
  ...timestamps,
});

export const applicantEducation = pgTable(
  'applicant_education',
  {
    id: uuid().primaryKey().defaultRandom(),
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    levelCode: text().notNull(),
    institution: text(),
    fieldOfStudy: text(),
    completionYear: smallint(),
    isCurrent: boolean().notNull().default(false),
    grade: text(),
    sortOrder: smallint().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('applicant_education_applicant_idx').on(t.applicantId)],
);

export const applicantExperience = pgTable(
  'applicant_experience',
  {
    id: uuid().primaryKey().defaultRandom(),
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    employerName: text().notNull(),
    jobTitle: text().notNull(),
    categoryCode: text(),
    /** First day of the month. */
    startMonth: date({ mode: 'string' }).notNull(),
    endMonth: date({ mode: 'string' }),
    isCurrent: boolean().notNull().default(false),
    description: text(),
    sortOrder: smallint().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('applicant_experience_applicant_idx').on(t.applicantId),
    check(
      'applicant_experience_dates',
      sql`(${t.isCurrent} and ${t.endMonth} is null)
       or (not ${t.isCurrent} and ${t.endMonth} is not null and ${t.endMonth} >= ${t.startMonth})`,
    ),
  ],
);

export const applicantSkills = pgTable(
  'applicant_skills',
  {
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    skillCode: text().notNull(),
    level: text({ enum: SKILL_LEVELS }).notNull(),
    years: smallint().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.applicantId, t.skillCode] }),
    index('applicant_skills_skill_idx').on(t.skillCode),
    check('applicant_skills_level_valid', sql`${t.level} in (${list(SKILL_LEVELS)})`),
    check('applicant_skills_years_range', sql`${t.years} between 0 and 50`),
  ],
);

export const applicantLanguages = pgTable(
  'applicant_languages',
  {
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    languageCode: text().notNull(),
    proficiency: text({ enum: LANGUAGE_PROFICIENCIES }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.applicantId, t.languageCode] }),
    check(
      'applicant_languages_proficiency_valid',
      sql`${t.proficiency} in (${list(LANGUAGE_PROFICIENCIES)})`,
    ),
  ],
);

export const applicantCertifications = pgTable(
  'applicant_certifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    issuer: text(),
    issuedMonth: date({ mode: 'string' }),
    expiresMonth: date({ mode: 'string' }),
    sortOrder: smallint().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('applicant_certifications_applicant_idx').on(t.applicantId)],
);

export const applicantPreferences = pgTable(
  'applicant_preferences',
  {
    applicantId: uuid()
      .primaryKey()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    categoryCodes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    minSalaryPkr: integer(),
    shifts: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    jobTypes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** null = as far as the matching radius policy allows. Never above 10 km. */
    willingRadiusM: integer(),
    availableFrom: date({ mode: 'string' }),
    ...timestamps,
  },
  (t) => [
    check('applicant_preferences_salary', sql`${t.minSalaryPkr} is null or ${t.minSalaryPkr} >= 0`),
    check(
      'applicant_preferences_radius',
      sql`${t.willingRadiusM} is null or ${t.willingRadiusM} between ${sql.raw(String(RADIUS_LIMITS.minM))} and ${sql.raw(String(RADIUS_LIMITS.maxM))}`,
    ),
  ],
);

/**
 * Uploads go straight from the browser to object storage (presigned PUT); this row tracks
 * them. A new upload of a single-file type sets `replaced_at` on the previous one — rows are
 * never deleted, so staff can always see what was checked.
 */
export const applicantDocuments = pgTable(
  'applicant_documents',
  {
    id: uuid().primaryKey().defaultRandom(),
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    typeCode: text().notNull(),
    storageKey: text().notNull().unique(),
    fileName: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    status: text({ enum: APPLICANT_DOCUMENT_STATUSES }).notNull().default('PENDING_UPLOAD'),
    scanResult: text(),
    reviewNote: text(),
    reviewedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp({ withTimezone: true }),
    uploadedAt: timestamp({ withTimezone: true }),
    /** Superseded by a newer upload, or removed by the applicant. */
    replacedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('applicant_documents_current_idx')
      .on(t.applicantId, t.typeCode)
      .where(sql`${t.replacedAt} is null`),
    check(
      'applicant_documents_status_valid',
      sql`${t.status} in (${list(APPLICANT_DOCUMENT_STATUSES)})`,
    ),
    check('applicant_documents_size_positive', sql`${t.sizeBytes} > 0`),
  ],
);

/**
 * Append-only history of staff identity checks (trigger + revoked UPDATE/DELETE). The latest
 * outcome is copied to `applicants.identity_status`.
 */
export const identityVerifications = pgTable(
  'identity_verifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    applicantId: uuid()
      .notNull()
      .references(() => applicants.id, { onDelete: 'restrict' }),
    /** The CNIC that was checked (it can be corrected later). */
    cnic: text().notNull(),
    method: text({ enum: IDENTITY_METHODS }).notNull(),
    outcome: text({ enum: IDENTITY_OUTCOMES }).notNull(),
    notes: text(),
    frontDocumentId: uuid().references(() => applicantDocuments.id, { onDelete: 'restrict' }),
    backDocumentId: uuid().references(() => applicantDocuments.id, { onDelete: 'restrict' }),
    verifiedBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('identity_verifications_applicant_idx').on(t.applicantId, t.createdAt),
    check('identity_verifications_method_valid', sql`${t.method} in (${list(IDENTITY_METHODS)})`),
    check(
      'identity_verifications_outcome_valid',
      sql`${t.outcome} in (${list(IDENTITY_OUTCOMES)})`,
    ),
  ],
);

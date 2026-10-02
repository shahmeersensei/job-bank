import {
  ageOn,
  computeCompleteness,
  experienceSchema,
  identityVerificationSchema,
  preferencesSchema,
  registerApplicantSchema,
  updatePersonalSchema,
  type ProfileFacts,
} from '@jobbank/shared';
import { describe, expect, it } from 'vitest';
import { applicantMachine } from './machine';

const empty: ProfileFacts = {
  hasPersonal: true,
  hasLocation: false,
  skillCount: 0,
  educationCount: 0,
  experienceCount: 0,
  hasNoExperience: false,
  hasPreferences: false,
  missingRequiredDocuments: 2,
  languageCount: 0,
};

describe('profile completeness', () => {
  it('weights the sections to 100%', () => {
    expect(computeCompleteness(empty).percent).toBe(20);
    expect(
      computeCompleteness({
        hasPersonal: true,
        hasLocation: true,
        skillCount: 2,
        educationCount: 1,
        experienceCount: 1,
        hasNoExperience: false,
        hasPreferences: true,
        missingRequiredDocuments: 0,
        languageCount: 1,
      }).percent,
    ).toBe(100);
  });

  it('counts "no work experience" as a completed experience section', () => {
    const result = computeCompleteness({ ...empty, hasNoExperience: true });
    expect(result.sections.find((s) => s.id === 'experience')?.done).toBe(true);
    expect(result.percent).toBe(30);
  });

  it('needs personal details, location and required documents to activate', () => {
    expect(computeCompleteness(empty).activationMissing).toEqual(['location', 'documents']);
    expect(
      computeCompleteness({ ...empty, hasLocation: true, missingRequiredDocuments: 0 })
        .activationMissing,
    ).toEqual([]);
  });
});

describe('applicant status machine', () => {
  it('activates only when nothing is missing, and only from DRAFT', () => {
    expect(
      applicantMachine.check('DRAFT', 'ACTIVATE', { activationMissing: ['documents'] }, 'system'),
    ).toMatchObject({ ok: false, message: expect.stringContaining('CNIC front and back') });
    expect(
      applicantMachine.check('DRAFT', 'ACTIVATE', { activationMissing: [] }, 'system'),
    ).toEqual({ ok: true, to: 'ACTIVE' });
    expect(
      applicantMachine.check('ACTIVE', 'ACTIVATE', { activationMissing: [] }, 'system').ok,
    ).toBe(false);
  });

  it('lets the applicant or staff pause and resume, but not employers or the system', () => {
    const ctx = { activationMissing: [] };
    expect(applicantMachine.transition('ACTIVE', 'DEACTIVATE', ctx, ['APPLICANT'])).toBe(
      'INACTIVE',
    );
    expect(applicantMachine.transition('INACTIVE', 'REACTIVATE', ctx, ['STAFF'])).toBe('ACTIVE');
    expect(applicantMachine.check('ACTIVE', 'DEACTIVATE', ctx, ['EMPLOYER']).ok).toBe(false);
    expect(applicantMachine.check('ACTIVE', 'DEACTIVATE', ctx, 'system').ok).toBe(false);
  });

  it('has no way out of RESTRICTED yet (the blacklist module owns it)', () => {
    expect(
      applicantMachine.availableEvents('RESTRICTED', { activationMissing: [] }, ['STAFF']),
    ).toEqual([]);
  });
});

describe('registration rules', () => {
  const valid = {
    fullName: 'Muhammad Ali',
    fatherName: 'Abdul Rehman',
    cnic: '42101-1234567-1',
    dateOfBirth: '1999-06-30',
    gender: 'MALE',
  };

  it('normalises the CNIC to 13 digits and treats an empty email as none', () => {
    expect(registerApplicantSchema.parse({ ...valid, email: '' })).toMatchObject({
      cnic: '4210112345671',
      email: null,
    });
  });

  it('accepts Urdu names and rejects digits in names', () => {
    expect(registerApplicantSchema.safeParse({ ...valid, fullName: 'محمد علی' }).success).toBe(
      true,
    );
    expect(registerApplicantSchema.safeParse({ ...valid, fullName: 'Ali 2' }).success).toBe(false);
  });

  it('requires applicants to be at least 18', () => {
    const today = new Date('2026-10-02T12:00:00Z');
    expect(ageOn('2008-10-02', today)).toBe(18);
    expect(ageOn('2008-10-03', today)).toBe(17);
    const seventeen = new Date();
    seventeen.setUTCFullYear(seventeen.getUTCFullYear() - 17);
    expect(
      registerApplicantSchema.safeParse({
        ...valid,
        dateOfBirth: seventeen.toISOString().slice(0, 10),
      }).success,
    ).toBe(false);
  });

  it('never fills defaults into a partial update', () => {
    expect(updatePersonalSchema.parse({ email: 'a@b.pk' })).toEqual({ email: 'a@b.pk' });
  });
});

describe('section rules', () => {
  const job = { employerName: 'Hashoo Foods', jobTitle: 'Packer', startMonth: '2021-03' };

  it('needs an end month unless the job is current, and never an end before the start', () => {
    expect(experienceSchema.safeParse({ hasNoExperience: false, items: [job] }).success).toBe(
      false,
    );
    expect(
      experienceSchema.safeParse({
        hasNoExperience: false,
        items: [{ ...job, isCurrent: true }],
      }).success,
    ).toBe(true);
    expect(
      experienceSchema.safeParse({
        hasNoExperience: false,
        items: [{ ...job, endMonth: '2020-01' }],
      }).success,
    ).toBe(false);
  });

  it('caps the willing radius at 10 km and rejects duplicate categories', () => {
    const base = { categoryCodes: ['DRIVING'], shifts: [], jobTypes: [] };
    expect(preferencesSchema.safeParse({ ...base, willingRadiusM: 10_000 }).success).toBe(true);
    expect(preferencesSchema.safeParse({ ...base, willingRadiusM: 10_500 }).success).toBe(false);
    expect(
      preferencesSchema.safeParse({ ...base, categoryCodes: ['DRIVING', 'DRIVING'] }).success,
    ).toBe(false);
  });

  it('needs a note when an identity check fails', () => {
    expect(
      identityVerificationSchema.safeParse({ outcome: 'REJECTED', method: 'DOCUMENT_REVIEW' })
        .success,
    ).toBe(false);
    expect(
      identityVerificationSchema.safeParse({ outcome: 'VERIFIED', method: 'IN_PERSON' }).success,
    ).toBe(true);
  });
});

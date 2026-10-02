import type { ProfileSectionId } from '@jobbank/shared';
import { ArrowRight, CircleCheck, Circle, FileText, UserRound } from 'lucide-react';
import NextLink from 'next/link';
import { Button, StatusPill } from '@/components/atoms';
import { KeyValue } from '@/components/molecules';
import { getMyProfile } from '@/domains/applicant';
import { requireRole } from '@/domains/auth';
import { formatPkMobileDisplay } from '@/lib/format/phone';
import { APPLICANT_STATUS_PILL, IDENTITY_PILL } from '../_components/applicants/labels';
import { StatusToggle } from './_components/StatusToggle';

export const metadata = { title: 'Applicant' };

/** Wizard step that edits each completeness section. */
const STEP_FOR: Record<ProfileSectionId, string> = {
  personal: 'personal',
  location: 'location',
  skills: 'skills',
  languages: 'skills',
  education: 'education',
  experience: 'experience',
  preferences: 'preferences',
  documents: 'documents',
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border bg-surface shadow-card grid content-start gap-4 rounded-xl border p-5">
      <h2 className="text-fg text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function ApplicantHomePage() {
  const { actor, user } = await requireRole('APPLICANT');
  const profile = await getMyProfile(actor);

  if (!profile) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <header className="grid gap-1">
          <h1 className="text-fg text-2xl font-semibold">Welcome to Saylani Job Bank</h1>
          <p className="text-fg-muted text-sm">
            Signed in as {user.phoneNumber ? formatPkMobileDisplay(user.phoneNumber) : user.name}.
          </p>
        </header>
        <Card title="Create your job seeker profile">
          <p className="text-fg-muted text-sm">
            Tell us about yourself, where you live and what work you can do. We match you with
            verified employers near your home, and arrange interviews through your Job Bank branch.
            Employers never see your phone number, CNIC or address.
          </p>
          <ol className="text-fg grid list-decimal gap-1 pl-5 text-sm">
            <li>Personal details (as on your CNIC)</li>
            <li>Your home on the map, and your nearest branch</li>
            <li>Education, work experience and skills</li>
            <li>Photos of your CNIC (front and back)</li>
          </ol>
          <Button asChild className="justify-self-start" rightIcon={<ArrowRight />}>
            <NextLink href="/applicant/profile">Start my profile</NextLink>
          </Button>
        </Card>
      </div>
    );
  }

  const { completeness } = profile;
  const missingForActivation = completeness.sections.filter((s) =>
    completeness.activationMissing.includes(s.id),
  );
  const firstName = profile.personal.fullName.split(/\s+/)[0];

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-fg text-2xl font-semibold">Welcome, {firstName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill {...APPLICANT_STATUS_PILL[profile.status]} />
            <StatusPill {...IDENTITY_PILL[profile.identityStatus]} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" leftIcon={<UserRound />}>
            <NextLink href="/applicant/profile">Edit profile</NextLink>
          </Button>
          <Button asChild variant="secondary" leftIcon={<FileText />}>
            <NextLink href="/applicant/documents">Documents</NextLink>
          </Button>
        </div>
      </header>

      {profile.status === 'DRAFT' && (
        <section
          aria-label="What is still needed"
          className="bg-warning-soft text-warning-soft-fg grid gap-2 rounded-xl px-5 py-4 text-sm"
        >
          <p className="font-semibold">Your profile is not live yet.</p>
          <p>To start being matched with jobs, complete:</p>
          <ul className="grid gap-1">
            {missingForActivation.map((s) => (
              <li key={s.id}>
                <NextLink
                  className="font-medium underline underline-offset-4"
                  href={`/applicant/profile?step=${STEP_FOR[s.id]}`}
                >
                  {s.label}
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      {profile.status === 'ACTIVE' && (
        <p className="bg-success-soft text-success-soft-fg rounded-xl px-5 py-4 text-sm">
          Your profile is live. Job Bank staff can now match you with verified jobs near your home.
        </p>
      )}
      {profile.status === 'INACTIVE' && (
        <p className="bg-surface-muted text-fg-muted rounded-xl px-5 py-4 text-sm">
          Your profile is paused, so you are not suggested for new jobs.
        </p>
      )}
      {profile.identityStatus === 'REJECTED' && (
        <section
          aria-label="Identity check"
          className="bg-danger-soft text-danger-soft-fg grid gap-1 rounded-xl px-5 py-4 text-sm"
        >
          <p className="font-semibold">Your identity could not be confirmed.</p>
          {profile.identityNote && <p>Staff note: {profile.identityNote}</p>}
          <p>
            Please correct your details or{' '}
            <NextLink
              className="font-medium underline underline-offset-4"
              href="/applicant/documents"
            >
              upload clearer CNIC photos
            </NextLink>
            , and staff will check again.
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card title="Profile completeness">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-fg-muted text-sm">A complete profile gets better matches.</span>
              <span className="text-fg numeric text-lg font-semibold">{completeness.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Profile completeness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completeness.percent}
              className="bg-surface-sunken h-2 overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>
          <ul className="grid gap-1">
            {completeness.sections.map((s) => (
              <li key={s.id}>
                <NextLink
                  href={`/applicant/profile?step=${STEP_FOR[s.id]}`}
                  className="hover:bg-surface-muted flex items-center gap-3 rounded-lg px-2 py-2 text-sm"
                >
                  {s.done ? (
                    <CircleCheck className="text-success size-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="text-fg-subtle size-5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-fg flex-1">{s.label}</span>
                  <span className="text-fg-muted text-xs">
                    {s.done ? 'Done' : 'Add'}
                    <span className="sr-only"> ({s.done ? 'complete' : 'missing'})</span>
                  </span>
                </NextLink>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid content-start gap-6">
          <Card title="Your Job Bank branch">
            {profile.branch ? (
              <KeyValue
                columns={1}
                items={[
                  { label: 'Branch', value: profile.branch.name },
                  { label: 'Address', value: profile.branch.address },
                  { label: 'Phone', value: profile.branch.phone },
                ]}
              />
            ) : (
              <p className="text-fg-muted text-sm">
                Choose your branch when you{' '}
                <NextLink className="text-accent underline" href="/applicant/profile?step=location">
                  add your home location
                </NextLink>
                .
              </p>
            )}
          </Card>
          {(profile.status === 'ACTIVE' || profile.status === 'INACTIVE') && (
            <Card title="Looking for work?">
              <p className="text-fg-muted text-sm">
                Found a job, or away for a while? Pause your profile and resume it any time.
              </p>
              <div>
                <StatusToggle status={profile.status} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

import { ROLE_LABELS } from '@jobbank/shared';
import { Link } from '@/components/atoms';
import { AuthLayout } from '@/components/templates';
import { InvalidLinkError, previewInvitation, type InvitationPreview } from '@/domains/auth';
import { AcceptInviteForm } from './AcceptInviteForm';

export const metadata = { title: 'Accept invitation' };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  let invite: InvitationPreview | null = null;
  try {
    invite = token ? await previewInvitation(token) : null;
  } catch (error) {
    if (!(error instanceof InvalidLinkError)) throw error;
  }

  if (!invite) {
    return (
      <AuthLayout
        title="This invitation can’t be used"
        subtitle="It may have expired, been replaced by a newer invitation, or already been accepted."
        footer={<Link href="/login">Go to sign in</Link>}
      >
        <p className="text-fg-muted text-sm">
          Ask the person who invited you to send a new invitation from the staff page.
        </p>
      </AuthLayout>
    );
  }

  const roles = invite.roles
    .map((r) => `${ROLE_LABELS[r.role]}${r.branchName ? ` — ${r.branchName}` : ''}`)
    .join(', ');
  return (
    <AuthLayout
      title={`Welcome, ${invite.name}`}
      subtitle={`You have been invited as ${roles}. Choose a password for ${invite.email}.`}
    >
      <AcceptInviteForm token={token} />
    </AuthLayout>
  );
}

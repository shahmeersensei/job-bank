import { ShieldOff } from 'lucide-react';
import { AuthLayout } from '@/components/templates';
import { SignOutButton } from '../../(dashboard)/_components/SignOutButton';

export const metadata = { title: 'Account disabled' };

export default function AccountDisabledPage() {
  return (
    <AuthLayout
      title="Your account is disabled"
      subtitle="You cannot use the Job Bank with this account right now."
    >
      <div className="grid gap-4">
        <div className="border-border bg-surface-muted text-fg-muted flex gap-3 rounded-xl border p-4 text-sm">
          <ShieldOff className="text-danger mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            If you think this is a mistake, please contact your Saylani Job Bank branch. Your
            records are kept safe while the account is disabled.
          </p>
        </div>
        <SignOutButton variant="secondary" />
      </div>
    </AuthLayout>
  );
}

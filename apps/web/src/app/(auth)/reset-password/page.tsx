import { Link } from '@/components/atoms';
import { AuthLayout } from '@/components/templates';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="You will be signed out on all devices."
      footer={<Link href="/login">Back to sign in</Link>}
    >
      <ResetPasswordForm token={token ?? ''} />
    </AuthLayout>
  );
}

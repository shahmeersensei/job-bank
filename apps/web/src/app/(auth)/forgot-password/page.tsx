import { Link } from '@/components/atoms';
import { AuthLayout } from '@/components/templates';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you sign in with. If it belongs to an account, we will email you a reset link."
      footer={<Link href="/login">Back to sign in</Link>}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

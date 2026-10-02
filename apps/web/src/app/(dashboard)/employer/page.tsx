import { WelcomePanel } from '../_components/WelcomePanel';

export const metadata = { title: 'Employer' };

export default function EmployerHomePage() {
  return (
    <WelcomePanel
      role="EMPLOYER"
      upcoming="Company registration and verification status arrive in M7; jobs in M8."
    />
  );
}

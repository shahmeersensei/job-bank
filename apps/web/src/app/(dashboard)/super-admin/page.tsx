import { WelcomePanel } from '../_components/WelcomePanel';

export const metadata = { title: 'Super Admin' };

export default function SuperAdminHomePage() {
  return (
    <WelcomePanel
      role="SUPER_ADMIN"
      upcoming="Manage branches and staff from the sidebar. Settings and master data (M5), the audit explorer (M15) and reports (M17) arrive later."
    />
  );
}

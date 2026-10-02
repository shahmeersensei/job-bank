import { WelcomePanel } from '../_components/WelcomePanel';

export const metadata = { title: 'Branch Admin' };

export default function BranchAdminHomePage() {
  return (
    <WelcomePanel
      role="BRANCH_ADMIN"
      upcoming="Manage your branch staff from the sidebar. Verified companies (M7) and the blacklist queue (M14) arrive later."
    />
  );
}

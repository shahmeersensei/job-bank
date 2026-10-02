import { WelcomePanel } from '../_components/WelcomePanel';

export const metadata = { title: 'Job Bank Staff' };

export default function StaffHomePage() {
  return (
    <WelcomePanel
      role="STAFF"
      upcoming="Applicants (M6), jobs (M8), the match pipeline (M10) and interviews (M11) appear here."
    />
  );
}

import { WelcomePanel } from '../_components/WelcomePanel';

export const metadata = { title: 'Applicant' };

export default function ApplicantHomePage() {
  return (
    <WelcomePanel
      role="APPLICANT"
      upcoming="Your profile, documents and job matches arrive in M6 and M9."
    />
  );
}

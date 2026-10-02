import { WelcomePanel } from '../_components/WelcomePanel';

export const metadata = { title: 'Verification' };

export default function VerifierHomePage() {
  return <WelcomePanel role="VERIFIER" upcoming="The company verification queue arrives in M7." />;
}

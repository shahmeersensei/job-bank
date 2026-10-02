import { homePathFor } from '@jobbank/shared';
import { Activity, LayoutGrid, LogIn } from 'lucide-react';
import NextLink from 'next/link';
import { Button } from '@/components/atoms';
import { BrandMark } from '@/components/brand';
import { getServerAuthState } from '@/domains/auth';

export default async function HomePage() {
  const state = await getServerAuthState();
  const signedIn = state.status === 'active';

  return (
    <main className="page-gutter mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6">
      <BrandMark />
      <div className="grid gap-2">
        <h1 className="text-fg text-3xl font-semibold">Saylani Job Bank</h1>
        <p className="text-fg-muted">
          One verified profile, one traceable journey to work — across every Job Bank branch.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <NextLink href={signedIn ? homePathFor(state.actor.roles) : '/login'}>
            <LogIn aria-hidden="true" /> {signedIn ? 'Go to my dashboard' : 'Sign in'}
          </NextLink>
        </Button>
        <Button asChild variant="secondary">
          <a href="/api/v1/health">
            <Activity aria-hidden="true" /> System health
          </a>
        </Button>
        {process.env.NODE_ENV !== 'production' && (
          <Button asChild variant="ghost">
            <NextLink href="/dev/components">
              <LayoutGrid aria-hidden="true" /> Component gallery
            </NextLink>
          </Button>
        )}
      </div>
    </main>
  );
}

'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/atoms';
import { toast } from '@/components/molecules';
import { apiFetch } from '@/lib/api/client';

export function useSignOut() {
  const router = useRouter();
  return async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      toast.error(
        'Could not sign out cleanly. Please close the browser if this is a shared device.',
      );
    }
    router.replace('/login');
    router.refresh();
  };
}

export function SignOutButton({ variant = 'ghost' }: { variant?: ButtonProps['variant'] }) {
  const signOut = useSignOut();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant={variant}
      leftIcon={<LogOut />}
      loading={pending}
      onClick={async () => {
        setPending(true);
        await signOut();
      }}
    >
      Sign out
    </Button>
  );
}

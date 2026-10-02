'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input } from '@/components/atoms';
import { FormField, toast } from '@/components/molecules';
import { ApiClientError, apiFetch } from '@/lib/api/client';

export function TwoFactorStatus({ canDisable }: { canDisable: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="text-fg-muted grid gap-4 text-sm">
      <p>
        Each time you sign in with your password you will also enter a code from your authenticator
        app.
      </p>
      <p>
        Lost your phone? Use one of your backup codes to sign in, then ask{' '}
        {canDisable ? 'your branch admin' : 'another Super Admin'} to reset two-factor so you can
        set it up again.
      </p>
      {canDisable ? (
        open ? (
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              try {
                await apiFetch('/api/v1/account/2fa/disable', {
                  method: 'POST',
                  body: { password },
                });
                toast.success('Two-factor authentication is off');
                router.refresh();
              } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Could not turn it off');
                setPending(false);
              }
            }}
          >
            <FormField label="Confirm your password" required error={error ?? undefined}>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={pending} disabled={!password}>
                Turn off two-factor
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" className="justify-self-start" onClick={() => setOpen(true)}>
            Turn off
          </Button>
        )
      ) : (
        <p className="text-fg font-medium">Required for your role — it cannot be turned off.</p>
      )}
    </div>
  );
}

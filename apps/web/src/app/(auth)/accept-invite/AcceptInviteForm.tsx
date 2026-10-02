'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/atoms';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import { PasswordFields, passwordReady } from '../_PasswordFields';

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setTouched(true);
        if (!passwordReady(password, confirm)) return;
        setPending(true);
        setError(null);
        try {
          const { data } = await apiFetch<{ kind: string; homePath?: string }>(
            '/api/v1/auth/invitations/accept',
            {
              method: 'POST',
              body: { token, password },
            },
          );
          router.replace(data.kind === 'signed_in' && data.homePath ? data.homePath : '/login');
          router.refresh();
        } catch (err) {
          setError(
            err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
          );
          setPending(false);
        }
      }}
    >
      <PasswordFields
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={setConfirm}
        showErrors={touched}
      />
      {error && (
        <p role="alert" className="bg-danger-soft text-danger-soft-fg rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth loading={pending}>
        Activate my account
      </Button>
    </form>
  );
}

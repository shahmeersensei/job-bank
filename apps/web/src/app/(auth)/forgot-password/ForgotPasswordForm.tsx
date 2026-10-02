'use client';

import { MailCheck, Mail } from 'lucide-react';
import { useState } from 'react';
import { Button, Input } from '@/components/atoms';
import { FormField } from '@/components/molecules';
import { ApiClientError, apiFetch } from '@/lib/api/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div
        role="status"
        className="border-border bg-surface-muted text-fg flex gap-3 rounded-xl border p-4 text-sm"
      >
        <MailCheck className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          If an account uses <strong>{email}</strong>, a reset link is on its way. It works once and
          expires in 60 minutes. Check your spam folder if you don’t see it.
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
          await apiFetch('/api/v1/auth/password/forgot', { method: 'POST', body: { email } });
          setSent(true);
        } catch (err) {
          setError(
            err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <FormField label="Email" required error={error ?? undefined}>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          startAdornment={<Mail aria-hidden="true" />}
          autoFocus
        />
      </FormField>
      <Button type="submit" fullWidth loading={pending} disabled={!email.includes('@')}>
        Send reset link
      </Button>
    </form>
  );
}

'use client';

import { PASSWORD_HINT, passwordSchema } from '@jobbank/shared';
import { Lock } from 'lucide-react';
import { Input } from '@/components/atoms';
import { FormField } from '@/components/molecules';

/** New password + confirmation, validated with the same rules as the API. */
export function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  showErrors,
}: {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  showErrors: boolean;
}) {
  const policy = passwordSchema.safeParse(password);
  const policyError = showErrors && !policy.success ? policy.error.issues[0]?.message : undefined;
  const mismatch = showErrors && confirm !== password ? 'Passwords do not match' : undefined;
  return (
    <>
      <FormField label="New password" required hint={PASSWORD_HINT} error={policyError}>
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          startAdornment={<Lock aria-hidden="true" />}
        />
      </FormField>
      <FormField label="Confirm new password" required error={mismatch}>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          startAdornment={<Lock aria-hidden="true" />}
        />
      </FormField>
    </>
  );
}

export const passwordReady = (password: string, confirm: string) =>
  passwordSchema.safeParse(password).success && password === confirm;

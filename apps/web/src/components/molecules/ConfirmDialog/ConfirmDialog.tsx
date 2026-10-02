'use client';

import { AlertDialog } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Textarea } from '@/components/atoms/Textarea';
import { FormField } from '../FormField';
import type { ConfirmDialogProps } from './confirmDialog.types';

export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  requireReason,
  onConfirm,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLength = requireReason?.minLength ?? 1;
  const reasonOk = !requireReason || reason.trim().length >= minLength;

  const setOpen = (next: boolean) => {
    if (pending) return;
    if (!next) {
      setReason('');
      setError(null);
    }
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const confirm = async () => {
    if (!reasonOk) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      setPending(false);
      setOpen(false);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="bg-overlay fixed inset-0 z-60" />
        <AlertDialog.Content className="border-border bg-surface shadow-popover fixed top-1/2 left-1/2 z-60 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-1/2 gap-4 overflow-y-auto rounded-xl border p-5">
          <div className="grid gap-1.5">
            <AlertDialog.Title className="text-fg text-lg font-semibold">{title}</AlertDialog.Title>
            {description ? (
              <AlertDialog.Description className="text-fg-muted text-sm">
                {description}
              </AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">{title}</AlertDialog.Description>
            )}
          </div>

          {children}

          {requireReason && (
            <FormField
              label={requireReason.label}
              required
              hint={minLength > 1 ? `At least ${minLength} characters.` : undefined}
            >
              <Textarea
                rows={3}
                value={reason}
                placeholder={requireReason.placeholder}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
          )}

          {error && (
            <p
              role="alert"
              className="bg-danger-soft text-danger-soft-fg rounded-lg px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            {/* Not AlertDialog.Action: that closes immediately; we close after onConfirm settles. */}
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              loading={pending}
              disabled={!reasonOk}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

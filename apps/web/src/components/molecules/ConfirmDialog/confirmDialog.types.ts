import type { ReactElement, ReactNode } from 'react';

export interface ConfirmDialogProps {
  title: string;
  description?: ReactNode;
  /** Extra content between the description and the actions (e.g. a preview). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  /**
   * Require a written reason before confirming — used for withdrawals, rejections and
   * other audited actions. The reason is passed to onConfirm.
   */
  requireReason?: { label: string; minLength?: number; placeholder?: string };
  /** May return a promise; the dialog shows a spinner and stays open until it settles. */
  onConfirm: (reason?: string) => void | Promise<void>;
  /** Element that opens the dialog. Omit when controlling with open/onOpenChange. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

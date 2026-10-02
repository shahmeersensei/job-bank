import type { ReactElement, ReactNode } from 'react';

export interface ModalProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Element that opens the modal. Omit when controlling with open/onOpenChange. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

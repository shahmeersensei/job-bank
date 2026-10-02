import type { ReactElement, ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (button, link). Tooltips must never hold essential info. */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayMs?: number;
}

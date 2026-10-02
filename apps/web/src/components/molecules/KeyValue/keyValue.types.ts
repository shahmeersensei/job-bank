import type { ReactNode } from 'react';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  /** Span both columns (long values like addresses). */
  wide?: boolean;
}

export interface KeyValueProps {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}

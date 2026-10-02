import type { ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  /** Optional count shown next to the label (e.g. pending items). */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

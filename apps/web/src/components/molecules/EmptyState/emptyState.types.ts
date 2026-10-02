import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Primary next step, e.g. a "Post a job" button. */
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

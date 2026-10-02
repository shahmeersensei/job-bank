import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from '@/design-system/tokens';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp: Date | string;
  /** Who performed the action, e.g. "Ayesha Khan (Verifier)". */
  actor?: string;
  tone?: Tone;
  icon?: LucideIcon;
}

export interface TimelineProps {
  items: TimelineItem[];
  /** Accessible name, e.g. "Verification history". */
  label: string;
  className?: string;
}

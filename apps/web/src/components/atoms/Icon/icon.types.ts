import type { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  /** A lucide-react icon component, e.g. `MapPin`. */
  as: LucideIcon;
  size?: IconSize;
  /**
   * Accessible name. Omit for decorative icons (hidden from screen readers);
   * provide it when the icon carries meaning on its own.
   */
  label?: string;
  className?: string;
}

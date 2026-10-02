import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Count of items needing attention (e.g. verification queue size). */
  badge?: number;
  /** Only active on an exact path match (use for dashboard home links). */
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface AppSidebarProps {
  sections: NavSection[];
  brand?: ReactNode;
  footer?: ReactNode;
  /** Called after a link is chosen — closes the mobile drawer. */
  onNavigate?: () => void;
  className?: string;
}

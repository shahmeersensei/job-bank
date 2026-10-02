import type { Role } from '@jobbank/shared';
import { ROLE_HOME } from '@jobbank/shared';
import {
  Building2,
  Gauge,
  ListTree,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

/**
 * Sidebar per role. Each module adds its pages here as they are delivered
 * (only routes that exist are listed — no dead links).
 */
export function navigationFor(role: Role): { title?: string; items: NavItemConfig[] }[] {
  const overview: NavItemConfig = {
    href: ROLE_HOME[role],
    label: 'Overview',
    icon: Gauge,
    exact: true,
  };
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        { items: [overview] },
        {
          title: 'Administration',
          items: [
            { href: '/super-admin/branches', label: 'Branches', icon: Building2 },
            { href: '/super-admin/staff', label: 'Staff', icon: Users },
            { href: '/super-admin/master-data', label: 'Master data', icon: ListTree },
            { href: '/super-admin/settings', label: 'Settings', icon: SlidersHorizontal },
          ],
        },
      ];
    case 'BRANCH_ADMIN':
      return [
        {
          items: [
            overview,
            { href: '/branch-admin/staff', label: 'Staff', icon: Users },
            { href: '/branch-admin/settings', label: 'Branch settings', icon: SlidersHorizontal },
          ],
        },
      ];
    default:
      return [{ items: [overview] }];
  }
}

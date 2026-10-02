import type { ReactNode } from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface DetailPageLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Status pill(s) shown beside the title. */
  status?: ReactNode;
  /** Primary actions (top-right on desktop, full-width row on phones). */
  actions?: ReactNode;
  children: ReactNode;
  /** Secondary column (summary, timeline). Stacks below content on small screens. */
  aside?: ReactNode;
}

import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Below-card content, e.g. "Don't have an account? Register". */
  footer?: ReactNode;
}

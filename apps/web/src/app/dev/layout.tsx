import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export const metadata = { robots: { index: false, follow: false } };

/** Developer-only routes (component gallery, demos). Never served in production. */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}

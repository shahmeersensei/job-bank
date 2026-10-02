import type NextLink from 'next/link';
import type { ComponentProps } from 'react';

export interface LinkProps extends ComponentProps<typeof NextLink> {
  /** Opens in a new tab with safe rel attributes and an sr-only hint. */
  external?: boolean;
  variant?: 'default' | 'subtle' | 'unstyled';
}

import { ExternalLink } from 'lucide-react';
import NextLink from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { LinkProps } from './link.types';

const variants = {
  default: 'text-accent underline underline-offset-4 hover:text-accent-hover',
  subtle: 'text-fg-muted hover:text-fg hover:underline underline-offset-4',
  unstyled: '',
} as const;

export function Link({ external, variant = 'default', className, children, ...props }: LinkProps) {
  return (
    <NextLink
      className={cn('focus-visible:focus-ring rounded-sm', variants[variant], className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    >
      {children}
      {external && (
        <>
          <ExternalLink className="ms-1 inline size-3.5 align-[-0.125em]" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </NextLink>
  );
}

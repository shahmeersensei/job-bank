'use client';

import { Avatar as RadixAvatar } from 'radix-ui';
import { cn } from '@/lib/utils/cn';
import type { AvatarProps } from './avatar.types';

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' } as const;

/** First letter of the first and last words, ignoring punctuation: "Sana Staff (Karachi)" → "SK". */
export function getInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter((letter): letter is string => Boolean(letter));
  if (letters.length === 0) return '?';
  const first = letters[0]!;
  const last = letters.length > 1 ? letters[letters.length - 1]! : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'bg-primary-soft inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full align-middle select-none',
        sizes[size],
        className,
      )}
    >
      {src && <RadixAvatar.Image src={src} alt={name} className="size-full object-cover" />}
      <RadixAvatar.Fallback
        delayMs={src ? 400 : 0}
        className="text-primary-soft-fg font-semibold"
        aria-label={src ? undefined : name}
      >
        {getInitials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

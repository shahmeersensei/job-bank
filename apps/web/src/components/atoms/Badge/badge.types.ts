import type { ComponentProps } from 'react';
import type { Tone } from '@/design-system/tokens';

export interface BadgeProps extends ComponentProps<'span'> {
  tone?: Tone;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
}

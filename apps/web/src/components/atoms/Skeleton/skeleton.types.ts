import type { ComponentProps } from 'react';

export interface SkeletonProps extends ComponentProps<'div'> {
  /** Renders N stacked text lines (last one shorter). */
  lines?: number;
}

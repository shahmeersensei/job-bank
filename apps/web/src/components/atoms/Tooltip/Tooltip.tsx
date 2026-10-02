'use client';

import { Tooltip as RadixTooltip } from 'radix-ui';
import type { TooltipProps } from './tooltip.types';

export function Tooltip({ content, children, side = 'top', delayMs = 300 }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayMs}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className="bg-fg text-bg shadow-popover z-80 max-w-xs rounded-md px-2.5 py-1.5 text-xs"
          >
            {content}
            <RadixTooltip.Arrow className="fill-fg" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

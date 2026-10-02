import type { Tone } from '@/design-system/tokens';

export const STATUS_PILL: Record<'ACTIVE' | 'DISABLED' | 'INVITED', { label: string; tone: Tone }> =
  {
    ACTIVE: { label: 'Active', tone: 'success' },
    INVITED: { label: 'Invited', tone: 'info' },
    DISABLED: { label: 'Disabled', tone: 'danger' },
  };

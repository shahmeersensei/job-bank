import type { Tone } from '@/design-system/tokens';

export interface StatusPillProps {
  /** Human label, e.g. "Under verification". Domains map their states → label + tone. */
  label: string;
  tone: Tone;
  /** Pulsing dot for states that need action (e.g. SLA breach, decision pending). */
  pulse?: boolean;
  className?: string;
}

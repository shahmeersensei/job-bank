/**
 * Design tokens for TypeScript consumers (charts, map overlays, status mapping).
 * Colour VALUES live in theme.css as CSS variables — reference them with `colorVar()`
 * so light/dark themes keep working; never hard-code hex values in components.
 */

export const tones = [
  'neutral',
  'primary',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
] as const;
export type Tone = (typeof tones)[number];

export type ColorToken =
  | 'bg'
  | 'surface'
  | 'surface-muted'
  | 'border'
  | 'fg'
  | 'fg-muted'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'focus';

export const colorVar = (token: ColorToken) => `var(--${token})`;

/** Mirrors Tailwind's default breakpoints (px). */
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

export const zIndex = {
  sticky: 20,
  header: 30,
  dropdown: 40,
  overlay: 50,
  modal: 60,
  toast: 70,
  tooltip: 80,
} as const;

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** Default locale/timezone for dates shown to users (all branches are in Pakistan). */
export const locale = { language: 'en-PK', timeZone: 'Asia/Karachi' } as const;

export const THEME_STORAGE_KEY = 'jb-theme';

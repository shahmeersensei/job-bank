'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Tooltip } from '@/components/atoms/Tooltip';
import { useTheme, type ThemePreference } from '@/design-system/theme-provider';
import type { ThemeToggleProps } from './themeToggle.types';

const order: ThemePreference[] = ['light', 'dark', 'system'];
const icons = { light: Sun, dark: Moon, system: Monitor } as const;
const labels = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' } as const;

/** Cycles light → dark → system. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();
  const next = order[(order.indexOf(preference) + 1) % order.length] ?? 'system';
  const Icon = icons[preference];

  return (
    <Tooltip content={`${labels[preference]} — switch to ${labels[next].toLowerCase()}`}>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={`${labels[preference]}. Switch to ${labels[next].toLowerCase()}`}
        onClick={() => setPreference(next)}
      >
        <Icon />
      </Button>
    </Tooltip>
  );
}

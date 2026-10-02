import type { ReactNode } from 'react';
import type { Tone } from '@/design-system/tokens';

export interface KanbanColumn<T> {
  id: string;
  title: string;
  tone?: Tone;
  items: T[];
}

/**
 * Read-only pipeline view. Moving a card between columns is intentionally NOT drag &
 * drop: every match-case transition has guards, actors and audit requirements, so it
 * happens through explicit actions on the card/detail page.
 */
export interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  getItemId: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onCardClick?: (item: T) => void;
  /** Accessible name, e.g. "Match pipeline for Sales Associate". */
  label: string;
  emptyLabel?: string;
  className?: string;
}

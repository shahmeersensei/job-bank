'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/atoms';

/** A list of editable cards ("Add another job") with a remove button per card. */
export function RepeatableList<T>({
  items,
  onChange,
  createItem,
  renderItem,
  itemLabel,
  addLabel,
  max,
  emptyHint,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, update: (changes: Partial<T>) => void, index: number) => ReactNode;
  /** Accessible name per card, e.g. (i) => `Job ${i + 1}`. */
  itemLabel: (index: number) => string;
  addLabel: string;
  max: number;
  emptyHint?: ReactNode;
}) {
  const baseId = useId();
  return (
    <div className="grid gap-3">
      {items.length === 0 && emptyHint && <p className="text-fg-muted text-sm">{emptyHint}</p>}
      {items.map((item, index) => (
        <div
          key={index}
          role="group"
          aria-labelledby={`${baseId}-${index}`}
          className="border-border grid gap-4 rounded-lg border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 id={`${baseId}-${index}`} className="text-fg text-sm font-semibold">
              {itemLabel(index)}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Remove ${itemLabel(index).toLowerCase()}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 />
            </Button>
          </div>
          {renderItem(
            item,
            (changes) => onChange(items.map((it, i) => (i === index ? { ...it, ...changes } : it))),
            index,
          )}
        </div>
      ))}
      {items.length < max && (
        <Button
          variant="secondary"
          className="justify-self-start"
          leftIcon={<Plus />}
          onClick={() => onChange([...items, createItem()])}
        >
          {addLabel}
        </Button>
      )}
    </div>
  );
}

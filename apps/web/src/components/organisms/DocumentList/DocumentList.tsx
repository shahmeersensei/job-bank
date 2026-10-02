'use client';

import { Eye, FileImage, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { StatusPill } from '@/components/atoms/StatusPill';
import { formatDate } from '@/lib/format/date';
import { formatBytes } from '@/lib/upload/validate-file';
import { cn } from '@/lib/utils/cn';
import type { DocumentListItem, DocumentListProps } from './documentList.types';

/** Uploaded documents with type, file details, review status and view/remove actions. */
export function DocumentList({
  items,
  label,
  onView,
  onRemove,
  empty,
  className,
}: DocumentListProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => void | Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return empty ? <div className={className}>{empty}</div> : null;
  }

  return (
    <ul aria-label={label} className={cn('grid gap-2', className)}>
      {items.map((item: DocumentListItem) => {
        const Icon = item.contentType.startsWith('image/') ? FileImage : FileText;
        return (
          <li
            key={item.id}
            className="border-border bg-surface flex flex-wrap items-center gap-3 rounded-lg border p-3"
          >
            <Icon className="text-fg-muted size-5 shrink-0" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p className="text-fg flex flex-wrap items-center gap-2 text-sm font-medium">
                {item.title}
                {item.status && <StatusPill {...item.status} />}
              </p>
              <p className="text-fg-subtle truncate text-xs">
                {item.fileName} · <span className="numeric">{formatBytes(item.sizeBytes)}</span>
                {item.uploadedAt && <> · {formatDate(item.uploadedAt)}</>}
              </p>
              {item.note && <p className="text-fg-muted text-xs">{item.note}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Eye />}
                  loading={busy === `view:${item.id}`}
                  aria-label={`View ${item.title}`}
                  onClick={() => run(`view:${item.id}`, () => onView(item))}
                >
                  View
                </Button>
              )}
              {onRemove && item.removable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  loading={busy === `remove:${item.id}`}
                  aria-label={`Remove ${item.title}`}
                  onClick={() => run(`remove:${item.id}`, () => onRemove(item))}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import type { ReactNode } from 'react';
import type { Tone } from '@/design-system/tokens';

export interface DocumentListItem {
  id: string;
  /** Document type, e.g. "CNIC (front)". */
  title: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string | null;
  status?: { label: string; tone: Tone };
  /** Extra line under the file, e.g. a reviewer's note. */
  note?: ReactNode;
  /** Shows a remove button (optional documents only). */
  removable?: boolean;
}

export interface DocumentListProps {
  items: DocumentListItem[];
  /** Accessible name, e.g. "Your documents". */
  label: string;
  /** Opens the document (callers fetch a short-lived link; staff views are audited). */
  onView?: (item: DocumentListItem) => void | Promise<void>;
  onRemove?: (item: DocumentListItem) => void | Promise<void>;
  empty?: ReactNode;
  className?: string;
}

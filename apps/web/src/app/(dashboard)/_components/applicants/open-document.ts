'use client';

import { toast } from '@/components/molecules';
import type { DocumentLink } from '@/domains/applicant';
import { apiFetch } from '@/lib/api/client';
import { errorMessage } from './form';

/**
 * Opens a document's short-lived link in a new tab. The tab is opened before the request so
 * pop-up blockers allow it; staff views are audited by the API.
 */
export async function openDocument(path: string) {
  const tab = window.open('', '_blank');
  try {
    const { data } = await apiFetch<DocumentLink>(path);
    if (tab) {
      tab.opener = null;
      tab.location.href = data.url;
    } else window.location.assign(data.url);
  } catch (err) {
    tab?.close();
    toast.error(errorMessage(err));
  }
}

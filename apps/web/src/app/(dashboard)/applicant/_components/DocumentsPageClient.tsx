'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ApplicantDocumentType, ApplicantProfile } from '@/domains/applicant';
import { DocumentsManager } from './DocumentsManager';

export function DocumentsPageClient({
  initialProfile,
  types,
}: {
  initialProfile: ApplicantProfile;
  types: ApplicantDocumentType[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  return (
    <div className="border-border bg-surface shadow-card rounded-xl border p-4 sm:p-6">
      <DocumentsManager
        profile={profile}
        types={types}
        onProfile={(next) => {
          setProfile(next);
          // Status and completeness on other pages may have changed (e.g. activation).
          if (next.status !== profile.status) router.refresh();
        }}
      />
    </div>
  );
}

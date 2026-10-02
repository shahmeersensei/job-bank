'use client';

import { Pause, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';
import { ConfirmDialog, toast } from '@/components/molecules';
import { apiFetch } from '@/lib/api/client';

/** Applicants pause their profile (no new job matches) or resume it. */
export function StatusToggle({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  const router = useRouter();
  const pausing = status === 'ACTIVE';
  return (
    <ConfirmDialog
      title={pausing ? 'Pause your profile?' : 'Resume your profile?'}
      description={
        pausing
          ? 'You will not be suggested for new jobs until you resume. Nothing is deleted.'
          : 'You will be suggested for jobs near you again.'
      }
      confirmLabel={pausing ? 'Pause profile' : 'Resume profile'}
      onConfirm={async () => {
        await apiFetch('/api/v1/applicants/me/status', {
          method: 'PATCH',
          body: { status: pausing ? 'INACTIVE' : 'ACTIVE' },
        });
        toast.success(pausing ? 'Your profile is paused' : 'Your profile is active again');
        router.refresh();
      }}
      trigger={
        <Button variant="secondary" leftIcon={pausing ? <Pause /> : <Play />}>
          {pausing ? 'Pause my profile' : 'Resume my profile'}
        </Button>
      }
    />
  );
}

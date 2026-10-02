'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';
import { ConfirmDialog, toast } from '@/components/molecules';
import { apiFetch } from '@/lib/api/client';

export function BranchStatusButton({
  branchId,
  isActive,
  name,
}: {
  branchId: string;
  isActive: boolean;
  name: string;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title={isActive ? `Deactivate ${name}?` : `Reactivate ${name}?`}
      description={
        isActive
          ? 'Staff keep their accounts, but the branch is hidden from new assignments and matching. You can reactivate it later.'
          : 'The branch becomes available for assignments and matching again.'
      }
      tone={isActive ? 'danger' : 'primary'}
      confirmLabel={isActive ? 'Deactivate' : 'Reactivate'}
      onConfirm={async () => {
        await apiFetch(`/api/v1/branches/${branchId}`, {
          method: 'PATCH',
          body: { isActive: !isActive },
        });
        toast.success(isActive ? 'Branch deactivated' : 'Branch reactivated');
        router.refresh();
      }}
      trigger={
        <Button variant={isActive ? 'secondary' : 'primary'}>
          {isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
      }
    />
  );
}

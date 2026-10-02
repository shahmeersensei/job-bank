import { requireRole } from '@/domains/auth';
import { listBranches } from '@/domains/branch';
import { BranchesTable } from '../../_components/branches/BranchesTable';

export const metadata = { title: 'Branches' };

export default async function BranchesPage() {
  const { actor } = await requireRole('SUPER_ADMIN');
  const branches = await listBranches(actor);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-fg text-2xl font-semibold">Branches</h1>
        <p className="text-fg-muted text-sm">
          {actor.activeBranchId
            ? 'Showing the branch selected in the top bar.'
            : 'Every Job Bank branch.'}
        </p>
      </header>
      <BranchesTable branches={branches} canCreate={actor.permissions.has('branch:manage')} />
    </div>
  );
}

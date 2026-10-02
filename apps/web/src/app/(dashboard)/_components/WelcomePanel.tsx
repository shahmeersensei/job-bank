import { ROLE_LABELS, type Role } from '@jobbank/shared';
import { Badge } from '@/components/atoms';
import { KeyValue } from '@/components/molecules';
import { describeMe, requireRole } from '@/domains/auth';
import { listBranches } from '@/domains/branch';
import { formatPkMobileDisplay } from '@/lib/format/phone';

/** M3 placeholder home for each role: proves who is signed in and what they can reach. */
export async function WelcomePanel({ role, upcoming }: { role: Role; upcoming: string }) {
  const { user, actor } = await requireRole(role);
  const me = await describeMe(user, actor);
  const visible = await listBranches(actor);

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-fg text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-fg-muted text-sm">{upcoming}</p>
      </header>

      <section className="border-border bg-surface shadow-card grid gap-4 rounded-xl border p-5">
        <h2 className="text-fg text-base font-semibold">Your account</h2>
        <KeyValue
          items={[
            { label: 'Role', value: me.roles.map((r) => ROLE_LABELS[r]).join(', ') },
            { label: 'Email', value: user.email },
            {
              label: 'Mobile',
              value: user.phoneNumber ? formatPkMobileDisplay(user.phoneNumber) : null,
            },
            {
              label: 'Branch scope',
              value: actor.roles.includes('SUPER_ADMIN')
                ? actor.activeBranchId
                  ? `Viewing one branch: ${visible[0]?.name ?? '—'}`
                  : 'All branches'
                : me.branches.map((b) => b.name).join(', ') || 'Not branch-scoped',
            },
          ]}
        />
      </section>

      <section className="border-border bg-surface shadow-card grid gap-3 rounded-xl border p-5">
        <h2 className="text-fg text-base font-semibold">
          Permissions{' '}
          <span className="text-fg-muted numeric text-sm font-normal">
            ({me.permissions.length})
          </span>
        </h2>
        <ul className="flex flex-wrap gap-2" aria-label="Your permissions">
          {me.permissions.map((permission) => (
            <li key={permission}>
              <Badge tone="neutral" size="sm" variant="outline" className="font-mono">
                {permission}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

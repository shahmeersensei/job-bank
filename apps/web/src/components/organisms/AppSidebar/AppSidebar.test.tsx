import { render, screen } from '@testing-library/react';
import { Briefcase, Gauge } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar, isNavItemActive } from './AppSidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/staff/jobs/42' }));

describe('isNavItemActive', () => {
  it('matches nested routes unless exact', () => {
    expect(isNavItemActive({ href: '/staff/jobs' }, '/staff/jobs/42')).toBe(true);
    expect(isNavItemActive({ href: '/staff/job' }, '/staff/jobs')).toBe(false);
    expect(isNavItemActive({ href: '/staff', exact: true }, '/staff/jobs')).toBe(false);
  });
});

describe('AppSidebar', () => {
  it('marks the active link and announces badges', () => {
    render(
      <AppSidebar
        sections={[
          {
            items: [
              { href: '/staff', label: 'Overview', icon: Gauge, exact: true },
              { href: '/staff/jobs', label: 'Jobs', icon: Briefcase, badge: 3 },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Jobs/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Jobs/ })).toHaveTextContent('3 pending');
  });
});

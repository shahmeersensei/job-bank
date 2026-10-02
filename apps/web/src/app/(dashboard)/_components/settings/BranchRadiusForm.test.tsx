import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { BranchRadiusForm } from './BranchRadiusForm';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const GLOBAL = { preferredM: 8000, maxM: 10_000 };

describe('BranchRadiusForm', () => {
  it('follows the global radius until switched on, then saves the branch radius', async () => {
    fetchMock.mockResolvedValue(json(200, { data: {} }));
    const { container } = render(
      <BranchRadiusForm
        branchId="b1"
        radius={{ ...GLOBAL, source: 'GLOBAL', capped: false }}
        global={GLOBAL}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save radius' })).toBeDisabled();
    expect(screen.queryByLabelText(/Maximum radius/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: /branch-specific radius/ }));
    const max = screen.getByLabelText(/Maximum radius/);
    await userEvent.clear(max);
    await userEvent.type(max, '6.5');
    await expectNoA11yViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Save radius' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.lastCall!;
    expect(url).toBe('/api/v1/radius-policies/branches/b1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ preferredM: 8000, maxM: 6500 });
  });

  it('removes the branch radius when switched back to global', async () => {
    fetchMock.mockResolvedValue(json(200, { data: {} }));
    render(
      <BranchRadiusForm
        branchId="b1"
        radius={{ preferredM: 4000, maxM: 6000, source: 'BRANCH', capped: false }}
        global={GLOBAL}
      />,
    );
    await userEvent.click(screen.getByRole('switch', { name: /branch-specific radius/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save radius' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.lastCall![1].method).toBe('DELETE');
  });

  it('shows the "within the global maximum" error on the max field', async () => {
    fetchMock.mockResolvedValue(
      json(422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Some fields are invalid',
          issues: [{ path: 'maxM', message: 'Must be within the global maximum of 9 km' }],
        },
      }),
    );
    render(
      <BranchRadiusForm
        branchId="b1"
        radius={{ preferredM: 4000, maxM: 6000, source: 'BRANCH', capped: false }}
        global={{ preferredM: 8000, maxM: 9000 }}
      />,
    );
    const max = screen.getByLabelText(/Maximum radius/);
    await userEvent.clear(max);
    await userEvent.type(max, '9.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save radius' }));
    expect(await screen.findByText(/global maximum of 9 km/)).toBeInTheDocument();
    expect(max).toHaveAttribute('aria-invalid', 'true');
  });
});

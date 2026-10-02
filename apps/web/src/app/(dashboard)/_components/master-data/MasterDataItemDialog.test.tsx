import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/atoms';
import { expectNoA11yViolations } from '@/test/a11y';
import { MasterDataItemDialog } from './MasterDataItemDialog';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const lastBody = () => JSON.parse(fetchMock.mock.lastCall![1].body as string);

async function open(type: Parameters<typeof MasterDataItemDialog>[0]['type'], parents = []) {
  render(<MasterDataItemDialog type={type} parents={parents} trigger={<Button>Open</Button>} />);
  await userEvent.click(screen.getByRole('button', { name: 'Open' }));
  return screen.getByRole('dialog');
}

describe('MasterDataItemDialog', () => {
  it('suggests a code from the label and posts type-specific meta', async () => {
    fetchMock.mockResolvedValue(json(201, { data: { id: 'x' } }));
    const dialog = await open('EDUCATION_LEVEL');
    await userEvent.type(screen.getByLabelText(/^Label/), 'Short course (TEVTA)');
    expect(screen.getByLabelText(/^Code/)).toHaveValue('SHORT_COURSE_TEVTA');
    const rank = screen.getByLabelText(/^Rank/);
    await userEvent.clear(rank);
    await userEvent.type(rank, '3');
    await expectNoA11yViolations(dialog);

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.lastCall!;
    expect(url).toBe('/api/v1/master-data');
    expect(init.headers['idempotency-key']).toMatch(/[0-9a-f-]{36}/);
    expect(lastBody()).toMatchObject({
      type: 'EDUCATION_LEVEL',
      code: 'SHORT_COURSE_TEVTA',
      label: 'Short course (TEVTA)',
      meta: { rank: 3 },
    });
  });

  it('keeps a hand-edited code when the label changes', async () => {
    await open('LANGUAGE');
    await userEvent.type(screen.getByLabelText(/^Code/), 'SHINA');
    await userEvent.type(screen.getByLabelText(/^Label/), 'Shina language');
    expect(screen.getByLabelText(/^Code/)).toHaveValue('SHINA');
  });

  it('shows the fields each type needs', async () => {
    await open('DOCUMENT_TYPE');
    expect(screen.getByRole('checkbox', { name: 'PDF' })).toBeChecked();
    expect(screen.getByLabelText(/Maximum size/)).toHaveValue(5);
    expect(screen.getByRole('switch', { name: /Required/ })).not.toBeChecked();
    expect(screen.queryByLabelText(/^Rank/)).not.toBeInTheDocument();
  });

  it('asks areas for their city', async () => {
    await open('AREA', [{ id: 'c1', label: 'Karachi' }] as never);
    expect(screen.getByRole('combobox', { name: /City/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Karachi' })).toBeInTheDocument();
  });

  it('shows server field errors next to the field', async () => {
    fetchMock.mockResolvedValue(
      json(422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Some fields are invalid',
          issues: [{ path: 'code', message: 'The code LUNCH is already used in this list' }],
        },
      }),
    );
    await open('REJECTION_REASON');
    await userEvent.type(screen.getByLabelText(/^Label/), 'Lunch');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText(/already used in this list/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(lastBody().meta).toEqual({ requiresNote: false });
  });

  it('locks the code when editing', async () => {
    render(
      <MasterDataItemDialog
        type="SKILL"
        parents={[]}
        open
        item={{
          id: 'i1',
          type: 'SKILL',
          code: 'PLUMBING',
          label: 'Plumbing',
          description: null,
          parentId: null,
          meta: {},
          sortOrder: 10,
          isActive: true,
        }}
      />,
    );
    expect(screen.getByLabelText(/^Code/)).toBeDisabled();
    expect(screen.getByRole('switch', { name: /Active/ })).toBeChecked();
  });
});

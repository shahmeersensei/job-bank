import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/atoms/Button';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('opens from its trigger and confirms', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Refer candidate?"
        onConfirm={onConfirm}
        trigger={<Button>Refer</Button>}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Refer' }));
    expect(screen.getByRole('alertdialog', { name: 'Refer candidate?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('requires a reason of minimum length and passes it on', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Withdraw case"
        tone="danger"
        confirmLabel="Withdraw"
        requireReason={{ label: 'Reason', minLength: 10 }}
        onConfirm={onConfirm}
        trigger={<Button>Open</Button>}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const confirm = screen.getByRole('button', { name: 'Withdraw' });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Reason/), 'too short');
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Reason/), ' — applicant moved city');
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('too short — applicant moved city');
  });

  it('stays open and shows the error when onConfirm fails', async () => {
    render(
      <ConfirmDialog
        title="Verify company"
        onConfirm={() => Promise.reject(new Error('Documents still pending review'))}
        trigger={<Button>Verify</Button>}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Documents still pending review');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

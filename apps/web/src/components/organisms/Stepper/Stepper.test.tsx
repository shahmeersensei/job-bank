import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './Stepper';

const steps = [
  { id: 'a', label: 'Personal' },
  { id: 'b', label: 'Location' },
  { id: 'c', label: 'Documents' },
];

describe('Stepper', () => {
  it('marks the current step and only lets users go back to completed steps', async () => {
    const onStepClick = vi.fn();
    render(<Stepper steps={steps} current={1} onStepClick={onStepClick} />);

    const current = screen
      .getAllByRole('listitem')
      .find((li) => li.getAttribute('aria-current') === 'step');
    expect(current).toHaveTextContent('Location');

    await userEvent.click(screen.getByRole('button', { name: /Personal/ }));
    expect(onStepClick).toHaveBeenCalledWith(0);
    expect(screen.queryByRole('button', { name: /Documents/ })).not.toBeInTheDocument();
  });
});

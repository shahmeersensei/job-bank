import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OTPInput } from './OTPInput';

function Harness({ onComplete }: { onComplete?: (code: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <OTPInput value={value} onChange={setValue} onComplete={onComplete} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const boxes = () => screen.getAllByRole('textbox');

describe('OTPInput', () => {
  it('renders one labelled box per digit inside a named group', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Verification code' })).toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
    expect(screen.getByLabelText('Digit 1 of 6')).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('advances focus while typing and fires onComplete once full', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('123456');
    expect(screen.getByTestId('value')).toHaveTextContent('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('ignores non-digits', async () => {
    render(<Harness />);
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('a1b2');
    expect(screen.getByTestId('value')).toHaveTextContent('12');
  });

  it('fills every box from a paste', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await userEvent.click(boxes()[0]!);
    await userEvent.paste('98-76 54');
    expect(screen.getByTestId('value')).toHaveTextContent('987654');
    expect(onComplete).toHaveBeenCalledWith('987654');
  });

  it('backspace on an empty box clears the previous one and moves back', async () => {
    render(<Harness />);
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('12');
    expect(boxes()[2]).toHaveFocus();
    await userEvent.keyboard('{Backspace}');
    expect(screen.getByTestId('value')).toHaveTextContent(/^1$/);
    expect(boxes()[1]).toHaveFocus();
  });

  it('keeps every digit when keystrokes arrive faster than re-renders', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    // Synchronous events with no awaits in between: the parent has not re-rendered yet.
    '873919'.split('').forEach((digit, index) => {
      fireEvent.change(boxes()[index]!, { target: { value: digit } });
    });
    expect(screen.getByTestId('value')).toHaveTextContent('873919');
    expect(onComplete).toHaveBeenCalledWith('873919');
  });

  it('spreads a whole code inserted into the first box (iOS SMS autofill)', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.change(boxes()[0]!, { target: { value: '533458' } });
    expect(screen.getByTestId('value')).toHaveTextContent('533458');
    expect(onComplete).toHaveBeenCalledWith('533458');
  });

  it('replaces a digit when typing into a filled box without a selection', () => {
    render(<Harness />);
    fireEvent.change(boxes()[0]!, { target: { value: '12' } });
    fireEvent.change(boxes()[0]!, { target: { value: '19' } });
    expect(screen.getByTestId('value')).toHaveTextContent(/^92$/);
  });
});

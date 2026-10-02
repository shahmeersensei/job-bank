import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  it('disables the placeholder option when required, without disabling the control', () => {
    render(
      <Select
        aria-label="Gender"
        required
        placeholder="Select"
        defaultValue=""
        options={[{ value: 'f', label: 'Female' }]}
      />,
    );
    const select = screen.getByLabelText('Gender');
    expect(select).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Select' })).toBeDisabled();
    // The wrapper's disabled styling must target the control, not any disabled descendant.
    expect(select.parentElement?.className).toContain('has-[:is(input,select,textarea):disabled]');
    expect(select.parentElement?.className).not.toMatch(/has-\[:disabled\]/);
  });
});

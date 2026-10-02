import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '@/components/atoms/Checkbox';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Textarea } from '@/components/atoms/Textarea';
import { expectNoA11yViolations } from '@/test/a11y';
import { FormField } from './FormField';

describe('FormField', () => {
  it('links label, hint and control automatically', () => {
    render(
      <FormField label="Full name" hint="As on your CNIC" required>
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText(/Full name/);
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('As on your CNIC');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the control invalid and announces the error', () => {
    render(
      <FormField label="Email" hint="We never share it" error="Enter a valid email">
        <Input type="email" />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid email');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });

  it('works for select and textarea too', () => {
    render(
      <>
        <FormField label="Trade">
          <Select options={[{ value: 'a', label: 'Electrician' }]} />
        </FormField>
        <FormField label="Notes" error="Too short">
          <Textarea />
        </FormField>
      </>,
    );
    expect(screen.getByLabelText('Trade').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true');
  });

  it('has no axe violations for a typical form', async () => {
    const { container } = render(
      <form>
        <FormField label="Full name" required hint="As on your CNIC">
          <Input />
        </FormField>
        <FormField label="Trade" error="Choose a trade">
          <Select placeholder="Choose" options={[{ value: 'a', label: 'Electrician' }]} />
        </FormField>
        <Checkbox label="I agree to the terms" />
      </form>,
    );
    await expectNoA11yViolations(container);
  });
});

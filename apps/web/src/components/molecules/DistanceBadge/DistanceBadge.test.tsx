import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistanceBadge } from './DistanceBadge';

describe('DistanceBadge', () => {
  it('shows the exact distance for staff views', () => {
    const { container } = render(<DistanceBadge meters={7_940} />);
    expect(container).toHaveTextContent('7.9 km');
  });

  it('never exposes the exact distance when masked (employer views)', () => {
    const { container } = render(<DistanceBadge meters={7_940} masked />);
    expect(container).toHaveTextContent('5–8 km');
    expect(container.innerHTML).not.toContain('7.9');
    expect(container.innerHTML).not.toContain('7940');
  });
});

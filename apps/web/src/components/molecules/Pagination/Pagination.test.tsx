import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getPageItems, Pagination } from './Pagination';

describe('getPageItems', () => {
  it('lists every page when there are few', () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('adds ellipses around the current page', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 20]);
    expect(getPageItems(10, 20)).toEqual([1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 20]);
    expect(getPageItems(20, 20)).toEqual([1, 'ellipsis-start', 16, 17, 18, 19, 20]);
  });

  it('always keeps a constant number of slots so the control does not jump', () => {
    for (let page = 1; page <= 30; page += 1) expect(getPageItems(page, 30)).toHaveLength(7);
  });
});

describe('Pagination', () => {
  it('marks the current page and navigates', async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={1} pageCount={5} onPageChange={onPageChange} pageSize={20} total={95} />,
    );
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByText('Showing 1–20 of 95')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

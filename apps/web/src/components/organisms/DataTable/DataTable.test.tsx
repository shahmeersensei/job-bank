import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { DataTable, nextSort } from './DataTable';
import type { DataTableColumn } from './dataTable.types';

interface Row {
  id: string;
  name: string;
  km: number;
}

const rows: Row[] = [
  { id: '1', name: 'Ahmed', km: 3 },
  { id: '2', name: 'Sana', km: 8 },
];

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
  { id: 'km', header: 'Distance', cell: (r) => `${r.km} km`, sortable: true, align: 'end' },
];

describe('nextSort', () => {
  it('starts ascending and toggles on the same column', () => {
    expect(nextSort(null, 'name')).toEqual({ id: 'name', direction: 'asc' });
    expect(nextSort({ id: 'name', direction: 'asc' }, 'name')).toEqual({
      id: 'name',
      direction: 'desc',
    });
    expect(nextSort({ id: 'name', direction: 'desc' }, 'name')).toEqual({
      id: 'name',
      direction: 'asc',
    });
    expect(nextSort({ id: 'name', direction: 'desc' }, 'km')).toEqual({
      id: 'km',
      direction: 'asc',
    });
  });
});

describe('DataTable', () => {
  it('renders an accessible table with aria-sort', () => {
    render(
      <DataTable
        caption="Candidates"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        sort={{ id: 'km', direction: 'desc' }}
        onSortChange={() => {}}
      />,
    );
    const table = screen.getByRole('table', { name: 'Candidates' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: /Distance/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none');
  });

  it('requests a sort change when a sortable header is clicked', async () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        caption="Candidates"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        sort={null}
        onSortChange={onSortChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith({ id: 'name', direction: 'asc' });
  });

  it('supports keyboard row activation', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        caption="Candidates"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    const [, firstRow] = screen.getAllByRole('row');
    firstRow!.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('shows the empty state and loading skeleton', () => {
    const { rerender } = render(
      <DataTable caption="Candidates" rows={[]} columns={columns} getRowId={(r) => r.id} />,
    );
    expect(screen.getByText('No records found')).toBeInTheDocument();
    rerender(
      <DataTable caption="Candidates" rows={[]} columns={columns} getRowId={(r) => r.id} loading />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('No records found')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <DataTable
        caption="Candidates"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        sort={null}
        onSortChange={() => {}}
      />,
    );
    await expectNoA11yViolations(container);
  });
});

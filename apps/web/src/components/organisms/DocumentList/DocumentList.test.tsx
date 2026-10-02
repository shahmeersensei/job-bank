import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { DocumentList } from './DocumentList';
import type { DocumentListItem } from './documentList.types';

const items: DocumentListItem[] = [
  {
    id: 'd1',
    title: 'CNIC (front)',
    fileName: 'front.jpg',
    sizeBytes: 245_000,
    contentType: 'image/jpeg',
    uploadedAt: '2026-10-01T10:00:00Z',
    status: { label: 'Accepted', tone: 'success' },
  },
  {
    id: 'd2',
    title: 'Education certificate',
    fileName: 'matric.pdf',
    sizeBytes: 1_200_000,
    contentType: 'application/pdf',
    uploadedAt: '2026-10-01T10:05:00Z',
    removable: true,
    note: 'Blurry photo',
  },
];

describe('DocumentList', () => {
  it('shows each document with its status and runs view/remove actions', async () => {
    const onView = vi.fn();
    const onRemove = vi.fn();
    const { container } = render(
      <DocumentList items={items} label="Documents" onView={onView} onRemove={onRemove} />,
    );

    expect(screen.getByRole('list', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Blurry photo')).toBeInTheDocument();
    // Required documents cannot be removed, so only the certificate has a remove button.
    expect(screen.queryByRole('button', { name: 'Remove CNIC (front)' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View CNIC (front)' }));
    expect(onView).toHaveBeenCalledWith(items[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Education certificate' }));
    expect(onRemove).toHaveBeenCalledWith(items[1]);
    await expectNoA11yViolations(container);
  });

  it('renders the empty state when there are no documents', () => {
    render(<DocumentList items={[]} label="Documents" empty={<p>Nothing uploaded yet</p>} />);
    expect(screen.getByText('Nothing uploaded yet')).toBeInTheDocument();
  });
});

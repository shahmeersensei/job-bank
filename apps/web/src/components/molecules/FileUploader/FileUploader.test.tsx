import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileUploader } from './FileUploader';
import type { UploadFn } from './fileUploader.types';

const pdf = (name: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });
const fileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

describe('FileUploader', () => {
  it('uploads, shows progress and reports uploaded keys', async () => {
    let resolveUpload: (value: { key: string }) => void = () => {};
    const upload = vi.fn<UploadFn>((_file, { onProgress }) => {
      onProgress(0.5);
      return new Promise<{ key: string }>((resolve) => (resolveUpload = resolve));
    });
    const onChange = vi.fn();
    const { container } = render(
      <FileUploader upload={upload} onChange={onChange} accept={['application/pdf']} />,
    );

    await userEvent.upload(fileInput(container), pdf('cv.pdf'));

    const progress = await screen.findByRole('progressbar', { name: 'Uploading cv.pdf' });
    expect(progress).toHaveAttribute('aria-valuenow', '50');

    resolveUpload({ key: 'uploads/cv.pdf' });
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([
        { key: 'uploads/cv.pdf', name: 'cv.pdf', size: 1024, type: 'application/pdf' },
      ]),
    );
  });

  it('rejects disallowed and oversized files without uploading them', async () => {
    const upload = vi.fn();
    const { container } = render(
      <FileUploader upload={upload} multiple accept={['application/pdf']} maxSizeBytes={2048} />,
    );
    const input = fileInput(container);
    // userEvent.upload would filter by `accept`; dispatch directly to exercise our validation.
    const files = [
      new File(['x'], 'photo.exe', { type: 'application/x-msdownload' }),
      pdf('big.pdf', 4096),
    ];
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('photo.exe: file type not allowed');
    expect(alert).toHaveTextContent('big.pdf: larger than 2 KB');
    expect(upload).not.toHaveBeenCalled();
  });

  it('shows an error with retry, and retry succeeds', async () => {
    const upload = vi
      .fn<UploadFn>()
      .mockRejectedValueOnce(new Error('Upload failed (HTTP 500)'))
      .mockResolvedValueOnce({ key: 'k1' });
    const { container } = render(<FileUploader upload={upload} />);

    await userEvent.upload(fileInput(container), pdf('cnic.pdf'));
    expect(await screen.findByText('Upload failed (HTTP 500)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry cnic.pdf' }));
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('enforces maxFiles', async () => {
    const upload = vi.fn<UploadFn>().mockResolvedValue({ key: 'k' });
    const { container } = render(<FileUploader upload={upload} multiple maxFiles={1} />);
    await userEvent.upload(fileInput(container), [pdf('a.pdf'), pdf('b.pdf')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('b.pdf: maximum of 1 file(s)');
    expect(upload).toHaveBeenCalledTimes(1);
  });
});

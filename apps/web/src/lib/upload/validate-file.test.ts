import { describe, expect, it } from 'vitest';
import { formatBytes, validateFile } from './validate-file';

const file = (name: string, type: string, size: number) => ({ name, type, size });

describe('validateFile', () => {
  const rules = { accept: ['application/pdf', 'image/*'], maxSizeBytes: 5 * 1024 * 1024 };

  it('accepts allowed types within size', () => {
    expect(validateFile(file('cv.pdf', 'application/pdf', 1000), rules)).toBeNull();
    expect(validateFile(file('cnic.jpg', 'image/jpeg', 1000), rules)).toBeNull();
  });

  it('rejects wrong type, oversize and empty files', () => {
    expect(validateFile(file('a.exe', 'application/x-msdownload', 10), rules)).toMatch(
      /not allowed/,
    );
    expect(validateFile(file('big.pdf', 'application/pdf', 6 * 1024 * 1024), rules)).toMatch(
      /larger than 5 MB/,
    );
    expect(validateFile(file('empty.pdf', 'application/pdf', 0), rules)).toMatch(/empty/);
  });
});

describe('formatBytes', () => {
  it.each([
    [500, '500 B'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5 MB'],
    [25 * 1024 * 1024, '25 MB'],
  ])('%d → %s', (bytes, expected) => expect(formatBytes(bytes)).toBe(expected));
});

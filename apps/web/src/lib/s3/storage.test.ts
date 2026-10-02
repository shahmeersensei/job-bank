import { describe, expect, it } from 'vitest';
import { assertUploadAllowed, buildObjectKey, UploadRejectedError } from './storage';

describe('object keys', () => {
  it('never include user file names and follow the branch/entity layout', () => {
    const key = buildObjectKey({
      branchId: 'b1',
      entity: 'applicant-documents',
      entityId: 'a1',
      contentType: 'application/pdf',
    });
    expect(key).toMatch(/^branch\/b1\/applicant-documents\/a1\/[0-9a-f-]{36}\.pdf$/);
  });

  it.each(['../etc', 'A Space', '', 'x/y'])('rejects unsafe segment %j', (segment) => {
    expect(() =>
      buildObjectKey({
        branchId: segment,
        entity: 'docs',
        entityId: 'a1',
        contentType: 'image/png',
      }),
    ).toThrow(/Unsafe/);
  });
});

describe('upload rules', () => {
  it('allows PDFs and images up to 10 MB', () => {
    expect(() => assertUploadAllowed('application/pdf', 2_000_000)).not.toThrow();
    expect(() => assertUploadAllowed('image/webp', 10 * 1024 * 1024)).not.toThrow();
  });

  it.each([
    ['text/html', 100, /not allowed/],
    ['application/pdf', 0, /empty/],
    ['application/pdf', 11 * 1024 * 1024, /exceeds 10 MB/],
  ])('rejects %s (%d bytes)', (type, size, message) => {
    expect(() => assertUploadAllowed(type, size)).toThrow(UploadRejectedError);
    expect(() => assertUploadAllowed(type, size)).toThrow(message);
  });
});

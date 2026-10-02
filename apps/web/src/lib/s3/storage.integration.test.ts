import { describe, expect, it } from 'vitest';
import { buildObjectKey, headObject, presignDownload, presignUpload } from './storage';

const bytes = new TextEncoder().encode('%PDF-1.7 integration test file');

describe('presigned uploads against S3-compatible storage', () => {
  it('uploads with a presigned PUT, verifies what landed, and downloads it back', async () => {
    const key = buildObjectKey({
      branchId: 'it-branch',
      entity: 'probe',
      entityId: 'p1',
      contentType: 'application/pdf',
    });
    const upload = await presignUpload({
      key,
      contentType: 'application/pdf',
      sizeBytes: bytes.byteLength,
    });

    const put = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: bytes });
    expect(put.status).toBe(200);

    expect(await headObject(key)).toEqual({
      sizeBytes: bytes.byteLength,
      contentType: 'application/pdf',
    });

    const download = await fetch(await presignDownload(key, { downloadName: 'cv "final".pdf' }));
    expect(download.status).toBe(200);
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(bytes);
  });

  it('rejects an upload whose size differs from what was approved', async () => {
    const key = buildObjectKey({
      branchId: 'it-branch',
      entity: 'probe',
      entityId: 'p2',
      contentType: 'application/pdf',
    });
    const upload = await presignUpload({ key, contentType: 'application/pdf', sizeBytes: 10 });
    const put = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: bytes });
    expect(put.ok).toBe(false);
    expect(await headObject(key)).toBeNull();
  });

  it('returns null for objects that do not exist', async () => {
    expect(await headObject('branch/none/probe/none/missing.pdf')).toBeNull();
  });
});

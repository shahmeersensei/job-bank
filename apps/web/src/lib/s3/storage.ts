import 'server-only';
import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, S3_BUCKET } from './client';

/** Default rules for user documents (CNIC scans, CVs, company papers, evidence). */
export const DOCUMENT_UPLOAD_RULES = {
  maxSizeBytes: 10 * 1024 * 1024,
  contentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const,
};

const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRejectedError';
  }
}

export function assertUploadAllowed(
  contentType: string,
  sizeBytes: number,
  rules: { maxSizeBytes: number; contentTypes: readonly string[] } = DOCUMENT_UPLOAD_RULES,
): void {
  if (!rules.contentTypes.includes(contentType)) {
    throw new UploadRejectedError(`File type ${contentType} is not allowed`);
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0)
    throw new UploadRejectedError('File is empty');
  if (sizeBytes > rules.maxSizeBytes) {
    throw new UploadRejectedError(
      `File exceeds ${Math.round(rules.maxSizeBytes / 1024 / 1024)} MB`,
    );
  }
}

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]{0,62}$/;

/**
 * Object keys never contain user-supplied file names (path traversal, PII in URLs).
 * Layout: branch/{branchId}/{entity}/{entityId}/{uuid}.{ext}
 */
export function buildObjectKey(input: {
  branchId: string;
  entity: string;
  entityId: string;
  contentType: string;
}): string {
  for (const [name, value] of Object.entries({
    branchId: input.branchId,
    entity: input.entity,
    entityId: input.entityId,
  })) {
    if (!SAFE_SEGMENT.test(value)) throw new Error(`Unsafe object key segment ${name}=${value}`);
  }
  const ext = EXTENSIONS[input.contentType] ?? '';
  return `branch/${input.branchId}/${input.entity}/${input.entityId}/${crypto.randomUUID()}${ext}`;
}

export interface PresignedUpload {
  key: string;
  url: string;
  method: 'PUT';
  /** Headers the client MUST send unchanged (they are part of the signature). */
  headers: Record<string, string>;
  expiresAt: string;
}

/**
 * Presigned PUT that locks content type and length, so the browser cannot upload
 * a different kind or size of file than the one the server approved.
 */
export async function presignUpload(input: {
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}): Promise<PresignedUpload> {
  const expiresIn = input.expiresInSeconds ?? 300;
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.sizeBytes,
  });
  const url = await getSignedUrl(s3, command, {
    expiresIn,
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return {
    key: input.key,
    url,
    method: 'PUT',
    headers: { 'Content-Type': input.contentType },
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/** Short-lived download link. Callers must check permissions and audit the access first. */
export async function presignDownload(
  key: string,
  options: { expiresInSeconds?: number; downloadName?: string } = {},
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ...(options.downloadName
      ? {
          ResponseContentDisposition: `attachment; filename="${options.downloadName.replace(/["\\\r\n]/g, '')}"`,
        }
      : {}),
  });
  return getSignedUrl(s3, command, { expiresIn: options.expiresInSeconds ?? 60 });
}

/** What actually landed in storage — verify this after upload instead of trusting the client. */
export async function headObject(
  key: string,
): Promise<{ sizeBytes: number; contentType: string } | null> {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return {
      sizeBytes: head.ContentLength ?? 0,
      contentType: head.ContentType ?? 'application/octet-stream',
    };
  } catch (error) {
    if (error instanceof NotFound || (error as { name?: string }).name === 'NotFound') return null;
    throw error;
  }
}

export type ScanResult = 'clean' | 'infected' | 'skipped';

/** Malware scanning hook. Phase 4 plugs in a real scanner (e.g. ClamAV); until then: skipped. */
export interface MalwareScanner {
  scan(key: string): Promise<ScanResult>;
}

export const malwareScanner: MalwareScanner = {
  scan: async () => 'skipped',
};

import * as path from 'path';

/** A browser must finish transferring within this window after creation. */
export const SOURCE_UPLOAD_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
/** Signed URLs are short-lived; the client re-signs on retry. */
export const SOURCE_UPLOAD_URL_TTL_SECONDS = 15 * 60;
/** Files above this size are transferred as S3 multipart uploads. */
export const SOURCE_UPLOAD_MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;
/** S3 requires every part except the last to be at least 5 MiB. */
export const SOURCE_UPLOAD_PART_SIZE_BYTES = 8 * 1024 * 1024;
/** Finished sessions are kept this long for idempotent completion replays. */
export const SOURCE_UPLOAD_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Key of a directly uploaded original. Lives under the org's top-level prefix
 * so the org purge and orphan sweep cover it (see org-storage-layout.ts).
 */
export function buildSourceUploadKey(
  orgId: string,
  sessionId: string,
  fileName: string,
): string {
  const sanitizedFileName = path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectFileName = ['', '.', '..'].includes(sanitizedFileName)
    ? 'upload'
    : sanitizedFileName;
  return `${orgId}/uploads/${sessionId}/${objectFileName}`;
}

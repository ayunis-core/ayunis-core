import { createHash } from 'crypto';

export interface PdfValidatorHeaders {
  etag: string | null;
  lastModified: string | null;
  contentLength: string | null;
}

/**
 * The first validator the server sent, in order of how reliably it changes
 * with the content: `ETag`, `Last-Modified`, `Content-Length`. Each version is
 * prefixed with its kind so a server switching validators reads as a change.
 */
export function pdfVersionFromHeaders(
  headers: PdfValidatorHeaders,
): string | null {
  const etag = headers.etag?.trim();
  if (etag) return `etag:${etag}`;
  const lastModified = headers.lastModified?.trim();
  if (lastModified) return `last-modified:${lastModified}`;
  // A HEAD answering `0` describes no body rather than an empty PDF.
  const contentLength = headers.contentLength?.trim();
  if (contentLength && contentLength !== '0')
    return `content-length:${contentLength}`;
  return null;
}

/**
 * A PDF without validators whose download exceeds the cap cannot be hashed;
 * it still gets a stable version, so it stays listed and is reported as too
 * large where it is downloaded rather than looking unlinked.
 */
export const PDF_VERSION_TOO_LARGE = 'too-large';

export function pdfVersionFromContent(content: Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

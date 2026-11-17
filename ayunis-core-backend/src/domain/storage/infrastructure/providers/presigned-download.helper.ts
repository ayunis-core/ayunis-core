import { create as contentDisposition } from 'content-disposition';
import type { DownloadRequest } from 'src/domain/storage/domain/download-request.object';

/** SigV4's basic ISO 8601 format, e.g. 20261117T120000Z. */
export function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

export function downloadQuery(
  request: DownloadRequest,
): Record<string, string> {
  const query: Record<string, string> = {};
  if (request.contentType !== undefined) {
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(request.contentType))
      throw new Error('Invalid response content type');
    query['response-content-type'] = request.contentType;
  }
  if (request.fileName !== undefined)
    query['response-content-disposition'] = contentDisposition(
      request.fileName,
    );
  return query;
}

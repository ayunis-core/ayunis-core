import type {
  OparlObject,
  OparlPage,
} from 'src/domain/oparl/application/models/oparl-object';

export interface OparlRequestOptions {
  /** Retry transient failures (429, 5xx, timeouts) with back-off; default true. */
  retry?: boolean;
  /** Aborts the request and its retries; the client then throws the signal's reason. */
  signal?: AbortSignal;
}

export interface OparlDownloadOptions extends OparlRequestOptions {
  /** Larger files fail with `OparlFileTooLargeError`, without being read to the end. */
  maxBytes: number;
}

export interface OparlDownload {
  data: Buffer;
  contentType: string | null;
}

/**
 * Reads an OParl API on a public host. Fails with `OparlHostBlockedError`,
 * `OparlRequestFailedError` or `OparlInvalidResponseError`.
 */
export abstract class OparlClientPort {
  abstract fetchObject(
    url: string,
    options?: OparlRequestOptions,
  ): Promise<OparlObject>;

  /** One page of a list (an OParl list object, or a plain array). */
  abstract fetchPage(
    url: string,
    options?: OparlRequestOptions,
  ): Promise<OparlPage>;

  /** A file (`accessUrl`, `downloadUrl`), under the same rules as the API. */
  abstract downloadFile(
    url: string,
    options: OparlDownloadOptions,
  ): Promise<OparlDownload>;
}

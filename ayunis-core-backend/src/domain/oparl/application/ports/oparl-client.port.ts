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
}

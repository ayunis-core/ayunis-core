import type { Readable } from 'stream';

/** How Microsoft Graph answered, unless it is unavailable. */
export type MicrosoftGraphResponse<T> =
  | { status: 'ok'; body: T }
  | { status: 'not_found' }
  /** `403`: not granted to the app. */
  | { status: 'access_denied' }
  /** `410`: a delta query must start over. */
  | { status: 'resync_required' }
  /** `429` or `503` with `Retry-After`. */
  | { status: 'throttled'; retryAt: Date }
  /** Any other `4xx`, e.g. a host of another tenant (`400`). */
  | { status: 'rejected'; httpStatus: number; code: string | null };

export type MicrosoftGraphDownload =
  | {
      status: 'ok';
      content: Readable;
      size: number;
      /** As SharePoint sends it: the type of the file name's extension. */
      contentType: string | null;
    }
  | Exclude<MicrosoftGraphResponse<never>, { status: 'ok' }>;

/**
 * Microsoft Graph v1.0 with an app-only token. Throws a
 * `ProviderUnavailableError` when Graph cannot be reached, times out or
 * answers `5xx`, or `429` without `Retry-After`.
 */
export abstract class MicrosoftGraphPort {
  /**
   * `GET` of a path below `/v1.0`, e.g. `/sites/{id}/drives`, or of a link
   * Graph returned (`@odata.nextLink`, `@odata.deltaLink`). A link to
   * another origin is refused, so the token never reaches it.
   */
  abstract get<T>(
    accessToken: string,
    pathOrLink: string,
  ): Promise<MicrosoftGraphResponse<T>>;

  /** The content behind a path such as `/drives/{id}/items/{id}/content`. */
  abstract download(
    accessToken: string,
    path: string,
  ): Promise<MicrosoftGraphDownload>;
}

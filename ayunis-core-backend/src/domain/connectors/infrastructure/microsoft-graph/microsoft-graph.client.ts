import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseRetryAfterMs } from '@ayunis/inference';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  type MicrosoftGraphDownload,
  MicrosoftGraphPort,
  type MicrosoftGraphResponse,
} from 'src/domain/connectors/application/ports/microsoft-graph.port';

const PROVIDER = { provider: 'microsoft_graph' };
const REQUEST_TIMEOUT_MS = 30_000;
/** Up to the whole body, which is read while it is stored. */
const DOWNLOAD_TIMEOUT_MS = 10 * 60_000;
const THROTTLING_STATUSES = new Set([429, 503]);

type Failure = Exclude<MicrosoftGraphResponse<never>, { status: 'ok' }>;

/** Microsoft Graph v1.0 over HTTPS, at `connectors.microsoftGraphOrigin`. */
@Injectable()
export class MicrosoftGraphClient extends MicrosoftGraphPort {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  /** Microsoft Graph, or the stand-in of the e2e tests. */
  private get origin(): string {
    return this.configService.get<string>(
      'connectors.microsoftGraphOrigin',
    ) as string;
  }

  async get<T>(
    accessToken: string,
    pathOrLink: string,
  ): Promise<MicrosoftGraphResponse<T>> {
    const response = await this.request(this.urlOf(pathOrLink), {
      headers: authorized(accessToken),
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return failureOf(response);
    try {
      return { status: 'ok', body: (await response.json()) as T };
    } catch (error) {
      throw wrapProviderFailure(error, PROVIDER) ?? error;
    }
  }

  async download(
    accessToken: string,
    path: string,
  ): Promise<MicrosoftGraphDownload> {
    const signal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
    let response = await this.request(this.urlOf(path), {
      headers: authorized(accessToken),
      redirect: 'manual',
      signal,
    });
    const location = response.headers.get('location');
    if (isRedirect(response.status) && location) {
      await response.body?.cancel();
      // A pre-authenticated download URL on the SharePoint host: the token
      // must not follow the redirect there.
      response = await this.request(location, { signal, redirect: 'follow' });
    }
    if (!response.ok) return failureOf(response);
    return contentOf(response);
  }

  private urlOf(pathOrLink: string): string {
    if (pathOrLink.startsWith('/')) return `${this.origin}/v1.0${pathOrLink}`;
    if (new URL(pathOrLink).origin !== this.origin)
      throw new Error('Refusing a Microsoft Graph link to another origin');
    return pathOrLink;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      throw wrapProviderFailure(error, PROVIDER) ?? error;
    }
  }
}

async function failureOf(response: Response): Promise<Failure> {
  const body = await readErrorBody(response);
  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
  if (THROTTLING_STATUSES.has(response.status) && retryAfterMs !== undefined)
    return {
      status: 'throttled',
      retryAt: new Date(Date.now() + retryAfterMs),
    };
  const unavailable = wrapProviderFailure(
    { status: response.status, headers: response.headers },
    PROVIDER,
  );
  if (unavailable) throw unavailable;
  switch (response.status) {
    case 403:
      return { status: 'access_denied' };
    case 404:
      return { status: 'not_found' };
    case 410:
      return { status: 'resync_required' };
    default:
      return {
        status: 'rejected',
        httpStatus: response.status,
        code: body?.error?.code ?? null,
      };
  }
}

async function contentOf(response: Response): Promise<MicrosoftGraphDownload> {
  const contentType = response.headers.get('content-type');
  const length = Number(response.headers.get('content-length') ?? NaN);
  if (response.body && Number.isSafeInteger(length))
    return {
      status: 'ok',
      content: Readable.fromWeb(response.body as WebReadableStream),
      size: length,
      contentType,
    };
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    status: 'ok',
    content: Readable.from([buffer]),
    size: buffer.length,
    contentType,
  };
}

function authorized(accessToken: string): Record<string, string> {
  return { Accept: 'application/json', Authorization: `Bearer ${accessToken}` };
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

async function readErrorBody(
  response: Response,
): Promise<{ error?: { code?: string } } | null> {
  try {
    return (await response.json()) as { error?: { code?: string } };
  } catch {
    return null;
  }
}

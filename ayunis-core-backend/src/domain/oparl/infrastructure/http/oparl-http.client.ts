import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { LookupOptions } from 'node:dns';
import { setTimeout as sleep } from 'node:timers/promises';
import { Agent, fetch, type Response } from 'undici';
import { ApplicationError } from 'src/common/errors/base.error';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import {
  buildBlockedAddresses,
  connectionAddressRecords,
  createConnectionLookup,
  isBlockedNetworkAddress,
  normalizeHostname,
  resolveHostnameAddresses,
} from 'src/common/util/network-address-policy';
import type {
  OparlObject,
  OparlPage,
} from 'src/domain/oparl/application/models/oparl-object';
import {
  OparlClientPort,
  type OparlDownload,
  type OparlDownloadOptions,
  type OparlRequestOptions,
} from 'src/domain/oparl/application/ports/oparl-client.port';
import {
  OparlFileTooLargeError,
  OparlHostBlockedError,
  OparlInvalidResponseError,
  OparlRequestFailedError,
} from 'src/domain/oparl/application/oparl.errors';
import { HostRequestLimiter } from './host-request-limiter';

export const OPARL_USER_AGENT =
  'Ayunis-Core-OParl-Mirror/1.0 (+https://www.ayunis.com)';
/** Per host and process, across all systems on that host. */
const MAX_CONCURRENT_REQUESTS_PER_HOST = 2;
/** Some RIS take about 40 s for a page of meetings. */
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
type ReadBody<T> = (url: string, response: Response) => Promise<T>;

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 300_000];
const MAX_RETRY_AFTER_MS = 15 * 60_000;

/**
 * OParl over http(s) on public hosts only: every request and redirect
 * target is checked, and connections are made only to the checked
 * addresses (no DNS rebinding). At most two requests per host at once; 429,
 * 5xx and network failures are retried with back-off, honouring
 * `Retry-After`.
 */
@Injectable()
export class OparlHttpClient
  extends OparlClientPort
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(OparlHttpClient.name);
  private readonly blockedAddresses = buildBlockedAddresses();
  private readonly limiter = new HostRequestLimiter(
    MAX_CONCURRENT_REQUESTS_PER_HOST,
  );
  private readonly dispatcher = new Agent({
    allowH2: false,
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
    connect: {
      lookup: createConnectionLookup((hostname, options) =>
        this.connectionAddresses(hostname, options),
      ),
    },
  });

  // After the queue workers stopped (their runs abort between pages).
  onApplicationShutdown(): Promise<void> {
    return this.dispatcher.close();
  }

  async fetchObject(
    url: string,
    options: OparlRequestOptions = {},
  ): Promise<OparlObject> {
    const { body } = await this.getJson(url, options);
    if (
      typeof body !== 'object' ||
      body === null ||
      Array.isArray(body) ||
      typeof (body as { id?: unknown }).id !== 'string'
    )
      throw new OparlInvalidResponseError(url, 'not an OParl object');
    return body as OparlObject;
  }

  async fetchPage(
    url: string,
    options: OparlRequestOptions = {},
  ): Promise<OparlPage> {
    const { body, finalUrl } = await this.getJson(url, options);
    return toPage(finalUrl, body);
  }

  async downloadFile(
    url: string,
    { maxBytes, ...options }: OparlDownloadOptions,
  ): Promise<OparlDownload> {
    return this.request(url, options, '*/*', async (target, response) => ({
      data: await this.readBody(target, response, maxBytes, () => {
        return new OparlFileTooLargeError(target, maxBytes);
      }),
      contentType: response.headers.get('content-type'),
    }));
  }

  protected resolveAddresses(hostname: string): Promise<string[]> {
    return resolveHostnameAddresses(hostname);
  }

  protected wait(ms: number, signal?: AbortSignal): Promise<void> {
    return sleep(ms, undefined, { signal });
  }

  private getJson(
    url: string,
    options: OparlRequestOptions,
  ): Promise<JsonResponse> {
    return this.request(
      url,
      options,
      'application/json',
      async (target, response) => ({
        body: await this.readJson(target, response),
        finalUrl: target,
      }),
    );
  }

  private async request<T>(
    url: string,
    { retry = true, signal }: OparlRequestOptions,
    accept: string,
    read: ReadBody<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      signal?.throwIfAborted();
      try {
        return await this.followRedirects(url, signal, accept, read);
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        const delay = retry ? retryDelay(error, attempt) : null;
        if (delay === null) throw error;
        this.logRetry(url, error as OparlRequestFailedError, attempt, delay);
        await this.wait(delay, signal);
      }
    }
  }

  private logRetry(
    url: string,
    error: OparlRequestFailedError,
    attempt: number,
    delayMs: number,
  ): void {
    this.logger.warn(
      {
        host: new URL(url).host,
        status: error.status,
        failureClass: error.metadata?.failureClass,
        code: error.metadata?.code,
        attempt: attempt + 1,
        delayMs,
      },
      'OParl request failed, retrying',
    );
  }

  private async followRedirects<T>(
    initialUrl: string,
    signal: AbortSignal | undefined,
    accept: string,
    read: ReadBody<T>,
  ): Promise<T> {
    let url = this.parse(initialUrl);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await this.assertPublic(url);
      const result = await this.limiter.run(url.host, () =>
        this.send(url, signal, accept, read),
      );
      if (!('location' in result)) return result.body;
      url = this.parse(new URL(result.location, url).href);
    }
    throw new OparlRequestFailedError(initialUrl, null, false, null, {
      reason: 'too many redirects',
    });
  }

  private async send<T>(
    url: URL,
    signal: AbortSignal | undefined,
    accept: string,
    read: ReadBody<T>,
  ): Promise<{ location: string } | { body: T }> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        dispatcher: this.dispatcher,
        redirect: 'manual',
        headers: { accept, 'user-agent': OPARL_USER_AGENT },
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      });
    } catch (error) {
      throw this.transportFailure(url.href, error);
    }
    const location = response.headers.get('location');
    if (REDIRECT_STATUSES.has(response.status) && location) {
      await response.body?.cancel();
      return { location };
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new OparlRequestFailedError(
        url.href,
        response.status,
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
        parseRetryAfter(response.headers.get('retry-after')),
      );
    }
    return { body: await read(url.href, response) };
  }

  private async readJson(url: string, response: Response): Promise<unknown> {
    const body = await this.readBody(
      url,
      response,
      MAX_RESPONSE_BYTES,
      () => new OparlInvalidResponseError(url, 'response too large'),
    );
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      throw new OparlInvalidResponseError(url, 'not JSON');
    }
  }

  private async readBody(
    url: string,
    response: Response,
    maxBytes: number,
    tooLarge: () => Error,
  ): Promise<Buffer> {
    const declared = Number(response.headers.get('content-length'));
    if (declared > maxBytes) {
      await response.body?.cancel();
      throw tooLarge();
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of response.body ?? []) {
        size += (chunk as Buffer).length;
        if (size > maxBytes) throw tooLarge();
        chunks.push(chunk as Buffer);
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw this.transportFailure(url, error);
    }
    return Buffer.concat(chunks);
  }

  private transportFailure(url: string, error: unknown): Error {
    const blocked = findInChain(error, OparlHostBlockedError);
    if (blocked) return blocked;
    const failure = classifyTransportError(error);
    return new OparlRequestFailedError(url, null, true, null, {
      failureClass: failure?.failureClass,
      code: failure?.code,
    });
  }

  private parse(url: string): URL {
    try {
      return new URL(url);
    } catch {
      throw new OparlHostBlockedError(url);
    }
  }

  private async assertPublic(url: URL): Promise<void> {
    if (url.protocol !== 'https:' && url.protocol !== 'http:')
      throw new OparlHostBlockedError(url.href);
    await this.publicAddresses(normalizeHostname(url.hostname), url.href);
  }

  private async publicAddresses(
    hostname: string,
    url: string,
  ): Promise<string[]> {
    let addresses: string[];
    try {
      addresses = await this.resolveAddresses(hostname);
    } catch (error) {
      const code = (error as { code?: string }).code;
      throw new OparlRequestFailedError(url, null, code !== 'ENOTFOUND', null, {
        reason: 'host not found',
        code,
      });
    }
    if (
      addresses.length === 0 ||
      addresses.some((address) =>
        isBlockedNetworkAddress(address, this.blockedAddresses),
      )
    )
      throw new OparlHostBlockedError(url);
    return addresses;
  }

  private async connectionAddresses(
    hostname: string,
    options: LookupOptions,
  ): Promise<Array<{ address: string; family: 4 | 6 }>> {
    const normalized = normalizeHostname(hostname);
    const addresses = await this.publicAddresses(normalized, normalized);
    const records = connectionAddressRecords(addresses, options.family);
    if (records.length === 0) throw new OparlHostBlockedError(normalized);
    return records;
  }
}

interface JsonResponse {
  body: unknown;
  /** After redirects; what relative links in the body are resolved against. */
  finalUrl: string;
}

function nextPageUrl(next: unknown, pageUrl: string): string | null {
  if (typeof next !== 'string' || next.length === 0) return null;
  return URL.parse(next, pageUrl)?.href ?? next;
}

function toPage(url: string, body: unknown): OparlPage {
  if (Array.isArray(body))
    return { data: body, nextUrl: null, totalElements: body.length };
  const list = body as {
    data?: unknown;
    links?: { next?: unknown } | null;
    pagination?: { totalElements?: unknown } | null;
  } | null;
  if (typeof list !== 'object' || list === null || !Array.isArray(list.data))
    throw new OparlInvalidResponseError(url, 'not an OParl list');
  const next = list.links?.next;
  const total = list.pagination?.totalElements;
  return {
    data: list.data,
    nextUrl: nextPageUrl(next, url),
    totalElements: typeof total === 'number' ? total : null,
  };
}

/** The wait before the next attempt, `null` for none. */
function retryDelay(error: unknown, attempt: number): number | null {
  if (
    !(error instanceof OparlRequestFailedError) ||
    !error.retryable ||
    attempt >= RETRY_DELAYS_MS.length
  )
    return null;
  if (error.retryAfterMs === null) return RETRY_DELAYS_MS[attempt];
  return error.retryAfterMs > MAX_RETRY_AFTER_MS
    ? null
    : Math.max(error.retryAfterMs, 1_000);
}

/** `Retry-After` in seconds or as an HTTP date, in milliseconds from now. */
export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function findInChain<E extends Error>(
  error: unknown,
  type: new (...args: never[]) => E,
): E | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof type) return current;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

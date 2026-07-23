import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import {
  RawUrlResponse,
  UrlRetrieverHandler,
  UrlRetrieverInput,
} from '../application/ports/url-retriever.handler';
import { UrlRetrieverResult } from '../domain/url-retriever-result.entity';
import {
  UrlRetrieverRetrievalError,
  UrlRetrieverTimeoutError,
  UrlRetrieverHttpError,
  UrlRetrieverParsingError,
  UrlRetrieverTooManyRedirectsError,
  UrlRetrieverContentTooLargeError,
} from '../application/url-retriever.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
// Upper bound for a caller-supplied `options.timeout`, so a request-controlled
// value can never disable the abort timer that bounds the whole fetch.
const MAX_TIMEOUT_MS = 60_000;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

@Injectable()
export class CheerioUrlRetrieverHandler extends UrlRetrieverHandler {
  private readonly logger = new Logger(CheerioUrlRetrieverHandler.name);
  private readonly defaultTimeout: number;
  private readonly maxDownloadBytes: number;

  // `url.timeout` and `url.maxDownloadBytes` always resolve — the `url` config
  // factory applies its own defaults (5s / 25 MB) — so read them with
  // getOrThrow rather than duplicating those defaults as dead fallbacks here.
  constructor(private readonly configService: ConfigService) {
    super();
    this.defaultTimeout = this.configService.getOrThrow<number>('url.timeout');
    this.maxDownloadBytes = this.configService.getOrThrow<number>(
      'url.maxDownloadBytes',
    );
  }

  async fetch(input: UrlRetrieverInput): Promise<RawUrlResponse> {
    try {
      return await this.fetchRaw(input);
    } catch (error) {
      return this.handleTopLevelError(error, input.url);
    }
  }

  private async fetchRaw(input: UrlRetrieverInput): Promise<RawUrlResponse> {
    this.logger.debug(`Retrieving URL: ${input.url} with Cheerio handler`);

    const timeout = this.resolveTimeout(input);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { response, finalUrl } = await this.fetchFollowingRedirects(
        input,
        controller.signal,
      );

      const contentType =
        response.headers.get('content-type')?.toLowerCase() ?? '';
      // Reject bad status / unsupported type from headers alone, before
      // buffering the body (cancelling the body stream on rejection).
      await this.assertResponseAcceptable(
        response,
        finalUrl,
        contentType,
        input,
      );
      // The timer stays armed through the body read — it is the longest phase,
      // so a slow-loris body must be bounded by the same timeout as the headers.
      // The size cap is enforced while streaming (readBodyWithCap), not from the
      // Content-Length header — proxies and buggy servers overstate it, which
      // would otherwise reject valid small payloads. Streaming still guarantees
      // the whole response is never buffered: it aborts once the cap is hit.
      const body = await this.readBodyWithCap(response, finalUrl);

      return { contentType, finalUrl, body };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UrlRetrieverTimeoutError(input.url, timeout, {
          originalError: error.message,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Resolve the effective request timeout: a caller-supplied `options.timeout`
   * is honored only when it is a positive finite number, and is clamped to
   * {@link MAX_TIMEOUT_MS} so it can never disable the abort timer.
   */
  private resolveTimeout(input: UrlRetrieverInput): number {
    const requested = input.options?.timeout;
    if (
      typeof requested === 'number' &&
      Number.isFinite(requested) &&
      requested > 0
    ) {
      return Math.min(requested, MAX_TIMEOUT_MS);
    }
    return this.defaultTimeout;
  }

  /**
   * Assert the response is a 2xx of an acceptable content type. On rejection the
   * body stream is cancelled so the underlying socket is released rather than
   * left dangling out of undici's connection pool.
   */
  private async assertResponseAcceptable(
    response: Response,
    finalUrl: string,
    contentType: string,
    input: UrlRetrieverInput,
  ): Promise<void> {
    try {
      this.assertHttpOk(response, finalUrl);
      input.assertContentType?.(contentType, finalUrl);
    } catch (error) {
      await this.discardBody(response);
      throw error;
    }
  }

  /** Best-effort release of an unconsumed response body. */
  private async discardBody(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
      // Nothing actionable — the socket is reclaimed on GC if cancel fails.
    }
  }

  /**
   * Follows HTTP redirects manually (redirect: 'manual') so the org crawl gate
   * can re-assert access on each hop BEFORE the target is contacted — otherwise
   * a crawl could be bounced onto a host bound to another org (AYC-190).
   */
  private async fetchFollowingRedirects(
    input: UrlRetrieverInput,
    signal: AbortSignal,
  ): Promise<{ response: Response; finalUrl: string }> {
    let currentUrl = input.url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(currentUrl, {
        signal,
        headers: { 'User-Agent': 'Ayunis/1.0' },
        redirect: 'manual',
      });

      const location = response.headers.get('location');
      if (!REDIRECT_STATUSES.has(response.status) || !location) {
        return { response, finalUrl: currentUrl };
      }

      const next = new URL(location, currentUrl);
      // The redirect response body is never needed once Location is read.
      // Release it up front so no throw below (scheme check or a gate denial in
      // onRedirect) can leave the socket dangling out of the connection pool.
      await this.discardBody(response);
      // Only follow http(s) redirects — a Location pointing at file:/data:/etc.
      // must not be dereferenced.
      if (!ALLOWED_PROTOCOLS.has(next.protocol)) {
        throw new UrlRetrieverRetrievalError(
          'Redirect to an unsupported URL scheme was blocked',
          { url: next.href },
        );
      }
      // Re-assert the gate before following; throwing rejects the redirect.
      await input.onRedirect?.(next.href);
      currentUrl = next.href;
    }

    throw new UrlRetrieverTooManyRedirectsError(input.url, MAX_REDIRECTS);
  }

  private assertHttpOk(response: Response, url: string): void {
    if (!response.ok) {
      throw new UrlRetrieverHttpError(url, response.status, {
        statusText: response.statusText,
      });
    }
  }

  /**
   * Stream the response body, aborting as soon as the accumulated size exceeds
   * the cap so a huge response never gets fully buffered into memory.
   *
   * When `response.body` is `null` (no payload) the response is buffered via
   * `arrayBuffer()` — this is safe because a body-less response cannot cause
   * unbounded memory growth. When a body stream is present we always read via
   * `getReader()` to enforce the cap incrementally.
   */
  private async readBodyWithCap(
    response: Response,
    url: string,
  ): Promise<Buffer> {
    if (!response.body) {
      const buf = Buffer.from(await response.arrayBuffer());
      this.assertSizeWithinCap(buf.byteLength, url);
      return buf;
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        // Throws before buffering the oversized chunk; the finally cancels.
        this.assertSizeWithinCap(total, url);
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks);
    } finally {
      // Release the lock / socket on every exit: size-cap throw, abort/timeout,
      // a mid-stream network error, or normal completion.
      await reader.cancel().catch(() => undefined);
    }
  }

  private assertSizeWithinCap(size: number, url: string): void {
    if (size > this.maxDownloadBytes) {
      throw new UrlRetrieverContentTooLargeError(url, this.maxDownloadBytes, {
        readBytes: size,
      });
    }
  }

  parseHtml(html: string, url: string): UrlRetrieverResult {
    try {
      const $ = cheerio.load(html);

      // Extract links before stripping tags — anchors live in the body.
      const links = this.extractLinks($, url);

      $('script, style, meta, link').remove();

      const textContent = $('body').text();
      const cleanedText = textContent.replace(/\s+/g, ' ').trim();
      const websiteTitle = $('title').text();

      return new UrlRetrieverResult(cleanedText, url, websiteTitle, {}, links);
    } catch (error) {
      throw new UrlRetrieverParsingError(
        url,
        error instanceof Error ? error.message : 'Unknown error',
        { error: error instanceof Error ? error.stack : 'Unknown error' },
      );
    }
  }

  /**
   * Collect absolute http(s) links from anchor tags, resolving relative hrefs
   * against the page URL. Fragments are stripped and duplicates removed so the
   * crawler sees each target page once.
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links = new Set<string>();

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const resolved = new URL(href, baseUrl);
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
          return;
        }
        resolved.hash = '';
        links.add(resolved.toString());
      } catch {
        // Malformed href — skip it.
      }
    });

    return [...links];
  }

  private handleTopLevelError(error: unknown, url: string): never {
    // Preserve domain errors (UrlRetrieverError) AND gate denials
    // (CrawlDomainAccessDeniedError, 404) — both extend ApplicationError and
    // must keep their own status rather than being rewritten to a 422. These
    // are expected outcomes (404/408/413/422), so they are NOT logged at error
    // level here — doing so would flood AppSignal on every crawl.
    if (error instanceof ApplicationError) {
      throw error;
    }

    this.logger.error(
      `HTTP URL retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'Unknown error',
    );

    // Transport classification is attached for debuggability only — a dead
    // customer site is not a provider outage, so the status stays 422 and no
    // ProviderUnavailableError is raised (AYC-538).
    const transport = classifyTransportError(error);
    throw new UrlRetrieverRetrievalError('Failed to retrieve URL with HTTP', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'Unknown error',
      ...(transport && {
        failureClass: transport.failureClass,
        underlyingCode: transport.code,
        host: transport.host,
      }),
    });
  }
}

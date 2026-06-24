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
} from '../application/url-retriever.errors';
import { ApplicationError } from 'src/common/errors/base.error';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

@Injectable()
export class CheerioUrlRetrieverHandler extends UrlRetrieverHandler {
  private readonly logger = new Logger(CheerioUrlRetrieverHandler.name);
  private readonly defaultTimeout: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.defaultTimeout = this.configService.get<number>('url.timeout') ?? 5000;
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

    const timeout =
      (input.options?.timeout as number | undefined) ?? this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { response, finalUrl } = await this.fetchFollowingRedirects(
        input,
        controller.signal,
      );
      clearTimeout(timeoutId);

      this.assertHttpOk(response, finalUrl);

      const contentType =
        response.headers.get('content-type')?.toLowerCase() ?? '';
      const body = Buffer.from(await response.arrayBuffer());

      return { contentType, finalUrl, body };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UrlRetrieverTimeoutError(input.url, timeout, {
          originalError: error.message,
        });
      }
      throw error;
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

      const nextUrl = new URL(location, currentUrl).href;
      // Re-assert the gate before following; throwing rejects the redirect.
      await input.onRedirect?.(nextUrl);
      currentUrl = nextUrl;
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
    this.logger.error(
      `HTTP URL retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'Unknown error',
    );

    // Preserve domain errors (UrlRetrieverError) AND gate denials
    // (CrawlDomainAccessDeniedError, 404) — both extend ApplicationError and
    // must keep their own status rather than being rewritten to a 422.
    if (error instanceof ApplicationError) {
      throw error;
    }

    throw new UrlRetrieverRetrievalError('Failed to retrieve URL with HTTP', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'Unknown error',
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import pLimit from 'p-limit';
import { RetrieveUrlUseCase } from '../retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from '../retrieve-url/retrieve-url.command';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import {
  UrlCrawlPage,
  UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import { UrlCrawlConstants } from 'src/domain/retrievers/url-retrievers/domain/url-crawl.constants';
import { CrawlUrlCommand } from './crawl-url.command';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Crawls a root URL breadth-first, following same-site links up to a bounded
 * depth and page count. The root page must be retrievable; individual child
 * pages that fail are logged and skipped.
 */
@Injectable()
export class CrawlUrlUseCase {
  private readonly logger = new Logger(CrawlUrlUseCase.name);

  constructor(private readonly retrieveUrlUseCase: RetrieveUrlUseCase) {}

  async execute(command: CrawlUrlCommand): Promise<UrlCrawlResult> {
    const maxDepth = this.clampDepth(command.maxDepth);
    this.logger.debug(`Crawling ${command.url} to depth ${maxDepth}`);

    // Root failure aborts the whole crawl (error propagates to caller).
    const rootResult = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(command.url, command.orgId),
    );

    // Anchor crawl identity to the post-redirect URL: links and stored pages
    // are keyed to rootResult.url, so deriving rootHost/visited from command.url
    // would drop same-site links and re-fetch the root after a redirect.
    const rootHost = this.hostOf(rootResult.url);
    const visited = new Set<string>([this.normalize(rootResult.url)]);
    const pages: UrlCrawlPage[] = [this.toPage(rootResult)];

    let frontier =
      maxDepth >= 1
        ? this.selectLinks(rootResult, rootHost, visited, this.remaining(pages))
        : [];

    for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
      const results = await this.fetchConcurrently(frontier, command.orgId);
      frontier = this.collectNextFrontier(
        results,
        pages,
        rootHost,
        visited,
        depth < maxDepth,
      );
    }

    this.logger.debug(
      `Crawl of ${command.url} produced ${pages.length} page(s)`,
    );
    return new UrlCrawlResult(pages);
  }

  /** Append fetched pages and gather the next wave of same-site links. */
  private collectNextFrontier(
    results: (UrlRetrieverResult | null)[],
    pages: UrlCrawlPage[],
    rootHost: string,
    visited: Set<string>,
    follow: boolean,
  ): string[] {
    const successful = results.filter(
      (result): result is UrlRetrieverResult => result !== null,
    );
    // Pages are stored under their post-redirect URL, but selectLinks only
    // marked the pre-redirect href visited. Dedupe by the canonical URL so
    // redirect collapses (two hrefs landing on one page, or a later link
    // pointing straight at a redirect target) don't push duplicate pages or
    // waste MAX_PAGES budget. Marking the canonical visited also stops future
    // waves from re-selecting links that resolve to it.
    const stored = new Set(pages.map((page) => this.normalize(page.url)));
    for (const result of successful) {
      const canonical = this.normalize(result.url);
      if (stored.has(canonical)) continue;
      stored.add(canonical);
      visited.add(canonical);
      pages.push(this.toPage(result));
    }
    if (!follow) return [];

    // Budget the next wave against the slots that remain once the entire
    // current batch has been appended — otherwise links picked early in the
    // loop reserve capacity that later pushes silently overrun (MAX_PAGES).
    const nextFrontier: string[] = [];
    for (const result of successful) {
      const remaining = this.remaining(pages) - nextFrontier.length;
      if (remaining <= 0) break;
      nextFrontier.push(
        ...this.selectLinks(result, rootHost, visited, remaining),
      );
    }
    return nextFrontier;
  }

  private fetchConcurrently(
    urls: string[],
    orgId: UUID,
  ): Promise<(UrlRetrieverResult | null)[]> {
    const limit = pLimit(UrlCrawlConstants.FETCH_CONCURRENCY);
    return Promise.all(
      urls.map((url) => limit(() => this.retrievePage(url, orgId))),
    );
  }

  private async retrievePage(
    url: string,
    orgId: UUID,
  ): Promise<UrlRetrieverResult | null> {
    try {
      return await this.retrieveUrlUseCase.execute(
        new RetrieveUrlCommand(url, orgId),
      );
    } catch (error) {
      // Both the URL and a downstream error message can carry signed query
      // tokens; log a redacted URL and a stable error code only, never the raw
      // URL query or error text, so secrets never reach centralized logs/AppSignal.
      this.logger.warn(
        `Skipping page during crawl: ${this.redactUrl(url)} (${this.describeError(error)})`,
      );
      return null;
    }
  }

  /** Origin + path only — drops the query/fragment where signed tokens live. */
  private redactUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return '[unparseable url]';
    }
  }

  /**
   * A non-sensitive label for a skipped-page failure: a domain error's stable
   * code, otherwise the error's class name. The raw message is intentionally
   * never logged — it can embed a full URL with signed query tokens.
   */
  private describeError(error: unknown): string {
    if (error instanceof ApplicationError) return error.code;
    if (error instanceof Error) return error.name;
    return 'Unknown error';
  }

  /**
   * Pick unvisited, same-site links from a page, up to `remaining` capacity.
   * Selected links are marked visited so later waves never re-fetch them.
   */
  private selectLinks(
    result: UrlRetrieverResult,
    rootHost: string,
    visited: Set<string>,
    remaining: number,
  ): string[] {
    if (remaining <= 0) return [];
    const selected: string[] = [];
    for (const link of result.links) {
      if (selected.length >= remaining) break;
      const key = this.normalize(link);
      if (visited.has(key)) continue;
      if (!this.isSameSite(rootHost, link)) continue;
      visited.add(key);
      selected.push(link);
    }
    return selected;
  }

  private remaining(pages: UrlCrawlPage[]): number {
    return UrlCrawlConstants.MAX_PAGES - pages.length;
  }

  private clampDepth(depth: number | undefined): number {
    const value = depth ?? 0;
    if (value < 0) return 0;
    return Math.min(value, UrlCrawlConstants.MAX_DEPTH);
  }

  private toPage(result: UrlRetrieverResult): UrlCrawlPage {
    return new UrlCrawlPage(result.url, result.content, result.websiteTitle);
  }

  private isSameSite(rootHost: string, url: string): boolean {
    if (!rootHost) return false;
    const host = this.hostOf(url);
    return host === rootHost || host.endsWith(`.${rootHost}`);
  }

  private hostOf(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  private normalize(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      // Strip `www.` to match hostOf/isSameSite so the apex and www variants
      // of the same page collapse to a single visited key (no duplicate fetch).
      parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      return parsed.toString();
    } catch {
      return url;
    }
  }
}

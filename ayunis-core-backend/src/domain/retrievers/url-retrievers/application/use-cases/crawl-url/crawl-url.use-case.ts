import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedUrlRetrieverError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import {
  isPdfLink,
  pdfFileName,
} from 'src/domain/retrievers/url-retrievers/domain/pdf-link';
import type { PdfLink } from 'src/domain/retrievers/url-retrievers/domain/pdf-link';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import pLimit from 'p-limit';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { GetPdfVersionUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/get-pdf-version/get-pdf-version.use-case';
import { GetPdfVersionCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/get-pdf-version/get-pdf-version.command';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import {
  UrlCrawlFailure,
  UrlCrawlPage,
  UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import type { UrlCrawlPdf } from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import { UrlCrawlConstants } from 'src/domain/retrievers/url-retrievers/domain/url-crawl.constants';
import { CrawlUrlCommand } from './crawl-url.command';
import { crawlFailureKindOf } from './crawl-failure-kind';
import { ApplicationError } from 'src/common/errors/base.error';

interface CrawlState {
  orgId: UUID;
  rootHost: string;
  visited: Set<string>;
  pages: UrlCrawlPage[];
  pdfLinks: Map<string, PdfLink>;
  failures: UrlCrawlFailure[];
  maxPages: number;
  maxPdfs: number;
}

/**
 * Crawls a root URL breadth-first, following same-site links up to a bounded
 * depth and, unless the caller lifts them, page and PDF caps. The root page
 * must be retrievable; child pages that fail are skipped and, when the failure
 * is transient or the page is gone, reported in the result's failures.
 */
@Injectable()
export class CrawlUrlUseCase {
  private readonly logger = new Logger(CrawlUrlUseCase.name);

  constructor(
    private readonly retrieveUrlUseCase: RetrieveUrlUseCase,
    private readonly getPdfVersionUseCase: GetPdfVersionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUrlRetrieverError)
  async execute(command: CrawlUrlCommand): Promise<UrlCrawlResult> {
    const maxDepth = this.clampDepth(command.maxDepth);
    this.logger.debug({ url: command.url, maxDepth }, 'Crawling URL');

    // Root failure aborts the whole crawl (error propagates to caller).
    const rootResult = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(command.url, command.orgId),
    );

    const state = this.initialState(command, rootResult);
    let frontier =
      maxDepth >= 1
        ? this.selectLinks(rootResult, state, this.remaining(state))
        : [];

    for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
      const results = await this.fetchConcurrently(frontier, state);
      for (const result of results) {
        if (result) this.collectPdfs(result, state);
      }
      frontier = this.collectNextFrontier(results, state, depth < maxDepth);
    }

    const pdfLinks = command.options.resolvePdfVersions
      ? await this.resolvePdfVersions(state)
      : [...state.pdfLinks.values()];

    this.logger.debug(
      {
        url: command.url,
        pageCount: state.pages.length,
        failureCount: state.failures.length,
      },
      'URL crawl completed',
    );
    return new UrlCrawlResult(state.pages, pdfLinks, state.failures);
  }

  private initialState(
    command: CrawlUrlCommand,
    rootResult: UrlRetrieverResult,
  ): CrawlState {
    const uncapped = command.options.liftCaps === true;
    // Anchor crawl identity to the post-redirect URL: links and stored pages
    // are keyed to rootResult.url, so deriving rootHost/visited from command.url
    // would drop same-site links and re-fetch the root after a redirect.
    const state: CrawlState = {
      orgId: command.orgId,
      rootHost: this.hostOf(rootResult.url),
      visited: new Set([this.normalize(rootResult.url)]),
      pages: [this.toPage(rootResult)],
      pdfLinks: new Map(),
      failures: [],
      maxPages: uncapped ? Infinity : UrlCrawlConstants.MAX_PAGES,
      maxPdfs: uncapped ? Infinity : UrlCrawlConstants.MAX_PDFS,
    };
    this.collectPdfs(rootResult, state);
    return state;
  }

  /** Append fetched pages and gather the next wave of same-site links. */
  private collectNextFrontier(
    results: (UrlRetrieverResult | null)[],
    state: CrawlState,
    follow: boolean,
  ): string[] {
    const successful = results.filter(
      (result): result is UrlRetrieverResult => result !== null,
    );
    // Pages are stored under their post-redirect URL, but selectLinks only
    // marked the pre-redirect href visited. Dedupe by the canonical URL so
    // redirect collapses (two hrefs landing on one page, or a later link
    // pointing straight at a redirect target) don't push duplicate pages or
    // waste the page budget. Marking the canonical visited also stops future
    // waves from re-selecting links that resolve to it.
    const stored = new Set(state.pages.map((page) => this.normalize(page.url)));
    for (const result of successful) {
      const canonical = this.normalize(result.url);
      if (stored.has(canonical)) continue;
      stored.add(canonical);
      state.visited.add(canonical);
      state.pages.push(this.toPage(result));
    }
    if (!follow) return [];

    // Budget the next wave against the slots that remain once the entire
    // current batch has been appended — otherwise links picked early in the
    // loop reserve capacity that later pushes silently overrun the page cap.
    const nextFrontier: string[] = [];
    for (const result of successful) {
      const remaining = this.remaining(state) - nextFrontier.length;
      if (remaining <= 0) break;
      nextFrontier.push(...this.selectLinks(result, state, remaining));
    }
    return nextFrontier;
  }

  private fetchConcurrently(
    urls: string[],
    state: CrawlState,
  ): Promise<(UrlRetrieverResult | null)[]> {
    const limit = pLimit(UrlCrawlConstants.FETCH_CONCURRENCY);
    return Promise.all(
      urls.map((url) => limit(() => this.retrievePage(url, state))),
    );
  }

  private async retrievePage(
    url: string,
    state: CrawlState,
  ): Promise<UrlRetrieverResult | null> {
    try {
      return await this.retrieveUrlUseCase.execute(
        new RetrieveUrlCommand(url, state.orgId),
      );
    } catch (error) {
      this.recordFailure(url, error, state, 'Skipping page during crawl');
      return null;
    }
  }

  private async resolvePdfVersions(state: CrawlState): Promise<UrlCrawlPdf[]> {
    const limit = pLimit(UrlCrawlConstants.FETCH_CONCURRENCY);
    const resolved = await Promise.all(
      [...state.pdfLinks.values()].map((pdf) =>
        limit(() => this.resolvePdfVersion(pdf, state)),
      ),
    );
    return resolved.filter((pdf): pdf is UrlCrawlPdf => pdf !== null);
  }

  private async resolvePdfVersion(
    pdf: PdfLink,
    state: CrawlState,
  ): Promise<UrlCrawlPdf | null> {
    try {
      const version = await this.getPdfVersionUseCase.execute(
        new GetPdfVersionCommand(pdf.url, state.orgId),
      );
      return { ...pdf, version };
    } catch (error) {
      this.recordFailure(pdf.url, error, state, 'Skipping PDF during crawl');
      return null;
    }
  }

  private recordFailure(
    url: string,
    error: unknown,
    state: CrawlState,
    message: string,
  ): void {
    // Both the URL and a downstream error message can carry signed query
    // tokens; log a redacted URL and a stable error code only, never the raw
    // URL query or error text, so secrets never reach centralized logs/AppSignal.
    this.logger.warn(
      { url: this.redactUrl(url), errorType: this.describeError(error) },
      message,
    );
    const kind = crawlFailureKindOf(error);
    if (kind) state.failures.push(new UrlCrawlFailure(url, kind));
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
    state: CrawlState,
    remaining: number,
  ): string[] {
    if (remaining <= 0) return [];
    const selected: string[] = [];
    for (const link of result.links) {
      if (selected.length >= remaining) break;
      if (isPdfLink(link) || result.pdfLinks.some((pdf) => pdf.url === link))
        continue;
      const key = this.normalize(link);
      if (state.visited.has(key)) continue;
      if (!this.isSameSite(state.rootHost, link)) continue;
      state.visited.add(key);
      selected.push(link);
    }
    return selected;
  }

  private collectPdfs(result: UrlRetrieverResult, state: CrawlState): void {
    const candidates = [
      ...result.pdfLinks,
      ...result.links
        .filter(isPdfLink)
        .map((url) => ({ url, name: pdfFileName(url) })),
    ];
    for (const link of candidates) {
      if (state.pdfLinks.size >= state.maxPdfs) break;
      const parsed = new URL(link.url);
      parsed.hash = '';
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
      const url = parsed.toString();
      if (!state.pdfLinks.has(url)) state.pdfLinks.set(url, { ...link, url });
    }
  }

  private remaining(state: CrawlState): number {
    return state.maxPages - state.pages.length;
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

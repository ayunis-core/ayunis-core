import type { PdfLink } from './pdf-link';

/**
 * A single page visited during a crawl.
 */
export class UrlCrawlPage {
  constructor(
    public readonly url: string,
    public readonly content: string,
    public readonly websiteTitle: string,
  ) {}
}

export interface UrlCrawlPdf extends PdfLink {
  /** Set only when the crawl was asked to resolve PDF versions. */
  version?: string;
}

export enum UrlCrawlFailureKind {
  /** Any other failure to read it: the resource may be back next time. */
  TRANSIENT = 'transient',
  /** 404 or 410: the resource no longer exists. */
  GONE = 'gone',
}

/** A child page or PDF the crawl found but could not read. */
export class UrlCrawlFailure {
  constructor(
    /** The URL as linked, before any redirect. */
    public readonly url: string,
    public readonly kind: UrlCrawlFailureKind,
  ) {}
}

/**
 * The aggregated result of crawling a root URL to a given depth.
 *
 * `pages[0]` is always the root page; subsequent entries are discovered
 * same-domain pages in breadth-first order.
 */
export class UrlCrawlResult {
  constructor(
    public readonly pages: UrlCrawlPage[],
    public readonly pdfLinks: UrlCrawlPdf[] = [],
    public readonly failures: UrlCrawlFailure[] = [],
  ) {}

  get rootPage(): UrlCrawlPage {
    return this.pages[0];
  }
}

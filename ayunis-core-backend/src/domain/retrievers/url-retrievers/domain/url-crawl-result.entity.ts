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

/**
 * The aggregated result of crawling a root URL to a given depth.
 *
 * `pages[0]` is always the root page; subsequent entries are discovered
 * same-domain pages in breadth-first order.
 */
export class UrlCrawlResult {
  constructor(public readonly pages: UrlCrawlPage[]) {}

  get rootPage(): UrlCrawlPage {
    return this.pages[0];
  }
}

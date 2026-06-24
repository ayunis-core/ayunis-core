/**
 * Bounds for recursive URL crawling.
 *
 * Crawling follows same-registrable-domain links breadth-first starting from a
 * root URL. These constants cap how far and how wide a crawl may go so that a
 * single source can never walk an unbounded portion of a site.
 */
export const UrlCrawlConstants = {
  /** Maximum link depth a caller may request (0 = root page only). */
  MAX_DEPTH: 2,
  /** Hard cap on the total number of pages fetched per crawl. */
  MAX_PAGES: 25,
  /** Maximum number of pages fetched concurrently within the crawl. */
  FETCH_CONCURRENCY: 5,
} as const;

import type { UUID } from 'crypto';

export interface CrawlUrlOptions {
  /** Drop the page and PDF caps; the depth still bounds the crawl. */
  liftCaps?: boolean;
  /** Give every PDF a version; PDFs whose version cannot be read are failures. */
  resolvePdfVersions?: boolean;
}

export class CrawlUrlCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
    /** Link depth to follow: 0 = root only, 1 = + linked pages, etc. */
    public readonly maxDepth: number = 0,
    public readonly options: CrawlUrlOptions = {},
  ) {}
}

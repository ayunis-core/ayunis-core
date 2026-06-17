import type { UUID } from 'crypto';

export class CrawlUrlCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
    /** Link depth to follow: 0 = root only, 1 = + linked pages, etc. */
    public readonly maxDepth: number = 0,
  ) {}
}

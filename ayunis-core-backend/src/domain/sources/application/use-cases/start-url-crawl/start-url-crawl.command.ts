import type { ReindexInterval } from 'src/domain/sources/domain/reindex-interval';

export class StartUrlCrawlCommand {
  readonly url: string;
  readonly maxDepth: number;
  /** Absent or null: the source is never re-indexed automatically. */
  readonly reindexInterval: ReindexInterval | null;

  constructor(params: {
    url: string;
    maxDepth: number;
    reindexInterval?: ReindexInterval | null;
  }) {
    this.url = params.url;
    this.maxDepth = params.maxDepth;
    this.reindexInterval = params.reindexInterval ?? null;
  }
}

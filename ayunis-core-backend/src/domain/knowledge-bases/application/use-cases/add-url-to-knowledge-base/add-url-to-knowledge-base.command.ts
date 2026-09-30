import type { UUID } from 'crypto';
import type { ReindexInterval } from 'src/domain/sources/domain/reindex-interval';

export class AddUrlToKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly url: string;
  readonly maxDepth: number;
  /** Absent or null: the source is never re-indexed automatically. */
  readonly reindexInterval: ReindexInterval | null;

  constructor(params: {
    knowledgeBaseId: UUID;
    url: string;
    maxDepth?: number;
    reindexInterval?: ReindexInterval | null;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.url = params.url;
    this.maxDepth = params.maxDepth ?? 0;
    this.reindexInterval = params.reindexInterval ?? null;
  }
}

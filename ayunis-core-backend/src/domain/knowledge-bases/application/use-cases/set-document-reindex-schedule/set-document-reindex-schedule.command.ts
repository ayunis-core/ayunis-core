import type { UUID } from 'crypto';
import type { ReindexInterval } from 'src/domain/sources/domain/reindex-interval';

export class SetDocumentReindexScheduleCommand {
  readonly knowledgeBaseId: UUID;
  readonly documentId: UUID;
  /** Null stops automatic re-indexing. */
  readonly reindexInterval: ReindexInterval | null;

  constructor(params: {
    knowledgeBaseId: UUID;
    documentId: UUID;
    reindexInterval: ReindexInterval | null;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.documentId = params.documentId;
    this.reindexInterval = params.reindexInterval;
  }
}

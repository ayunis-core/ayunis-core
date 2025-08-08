import { UUID } from 'crypto';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';

export class IngestContentCommand {
  orgId: UUID;
  indexEntry: IndexEntry;
  content: string;

  constructor(params: {
    orgId: UUID;
    indexEntry: IndexEntry;
    content: string;
  }) {
    this.orgId = params.orgId;
    this.indexEntry = params.indexEntry;
    this.content = params.content;
  }
}

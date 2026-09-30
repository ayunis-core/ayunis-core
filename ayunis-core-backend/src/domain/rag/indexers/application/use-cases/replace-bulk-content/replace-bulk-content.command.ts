import type { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';

export class ReplaceBulkContentCommand {
  prepared: PreparedIndexContent;

  constructor(params: { prepared: PreparedIndexContent }) {
    this.prepared = params.prepared;
  }
}

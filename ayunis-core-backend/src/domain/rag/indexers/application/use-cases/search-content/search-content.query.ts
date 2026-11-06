import type { UUID } from 'crypto';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';

export class SearchMultiContentQuery {
  orgId: UUID;
  documentIds: UUID[];
  queries: string[];
  type: IndexType;
  /** Maximum matches per query, before merging across queries. */
  limit?: number;

  constructor(params: {
    orgId: UUID;
    queries: string[];
    documentIds: UUID[];
    type: IndexType;
    limit?: number;
  }) {
    this.orgId = params.orgId;
    this.queries = params.queries;
    this.documentIds = params.documentIds;
    this.type = params.type;
    this.limit = params.limit;
  }
}

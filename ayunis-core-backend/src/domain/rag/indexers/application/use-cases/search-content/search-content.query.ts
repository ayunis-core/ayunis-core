import { UUID } from 'crypto';
import { IndexType } from '../../../domain/value-objects/index-type.enum';

export class SearchContentQuery {
  documentId: UUID;
  query: string;
  type: IndexType;
  limit?: number;

  constructor(params: {
    query: string;
    documentId: UUID;
    type: IndexType;
    limit?: number;
  }) {
    this.query = params.query;
    this.documentId = params.documentId;
    this.type = params.type;
    this.limit = params.limit;
  }
}

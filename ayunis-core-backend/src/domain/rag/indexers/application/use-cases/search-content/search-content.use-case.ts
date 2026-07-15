import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IndexRegistry } from '../../indexer.registry';
import {
  SearchContentQuery,
  SearchMultiContentQuery,
} from './search-content.query';
import type { IndexEntry } from '../../../domain/index-entry.entity';
import { UnexpectedIndexError } from '../../indexer.errors';

@Injectable()
export class SearchContentUseCase {
  private readonly logger = new Logger(SearchContentUseCase.name);
  constructor(private readonly indexRegistry: IndexRegistry) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(query: SearchContentQuery): Promise<IndexEntry[]> {
    const index = this.indexRegistry.get(query.type);
    return await index.search({
      orgId: query.orgId,
      documentId: query.documentId,
      query: query.query,
      filter: { limit: query.limit ?? undefined },
    });
  }

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async executeMulti(query: SearchMultiContentQuery): Promise<IndexEntry[]> {
    const index = this.indexRegistry.get(query.type);
    return await index.searchMulti({
      orgId: query.orgId,
      documentIds: query.documentIds,
      query: query.query,
      filter: { limit: query.limit ?? undefined },
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { SearchMultiContentQuery } from './search-content.query';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class SearchContentUseCase {
  private readonly logger = new Logger(SearchContentUseCase.name);

  constructor(private readonly indexRegistry: IndexRegistry) {}

  async executeMulti(query: SearchMultiContentQuery): Promise<IndexMatch[]> {
    try {
      const index = this.indexRegistry.get(query.type);
      return await index.searchMulti({
        orgId: query.orgId,
        documentIds: query.documentIds,
        queries: query.queries,
        filter: { limit: query.limit ?? undefined },
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Failed to search content');
      throw new UnexpectedIndexError(error as Error);
    }
  }
}

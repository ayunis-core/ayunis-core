import { Injectable, Logger } from '@nestjs/common';
import { IndexRegistry } from '../../indexer.registry';
import { SearchContentQuery } from './search-content.query';
import { IndexEntry } from '../../../domain/index-entry.entity';
import { UnexpectedIndexError } from '../../indexer.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class SearchContentUseCase {
  private readonly logger = new Logger(SearchContentUseCase.name);
  constructor(private readonly indexRegistry: IndexRegistry) {}

  async execute(query: SearchContentQuery): Promise<IndexEntry[]> {
    try {
      const index = this.indexRegistry.get(query.type);
      return index.search({
        orgId: query.orgId,
        documentId: query.documentId,
        query: query.query,
        filter: { limit: query.limit ?? undefined },
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedIndexError(error as Error);
    }
  }
}

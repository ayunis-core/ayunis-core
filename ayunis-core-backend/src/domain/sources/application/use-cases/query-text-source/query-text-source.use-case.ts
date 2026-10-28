import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { QueryTextSourceCommand } from './query-text-source.command';

const MAX_SOURCE_QUERY_MATCHES = 10;

@Injectable()
export class QueryTextSourceUseCase {
  private readonly logger = new Logger(QueryTextSourceUseCase.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly searchContentUseCase: SearchContentUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: QueryTextSourceCommand,
  ): Promise<TextSourceContentChunk[]> {
    const logContext = {
      sourceId: command.filter.sourceId,
      text: command.query,
    };
    this.logger.log({ orgId: command.orgId, ...logContext }, 'execute');
    if (!command.query || command.query.trim().length === 0) {
      this.logger.warn('Empty query provided for vector search');
      return [];
    }

    this.logger.debug(logContext, 'Performing vector search');

    const searchQuery = new SearchContentQuery({
      orgId: command.orgId,
      documentId: command.filter.sourceId,
      query: command.query,
      type: IndexType.PARENT_CHILD,
      limit: MAX_SOURCE_QUERY_MATCHES,
    });

    const indexEntries = await this.searchContentUseCase.execute(searchQuery);

    this.logger.debug(
      { ...logContext, entryCount: indexEntries.length },
      'Found index entries for vector search',
    );

    if (indexEntries.length === 0) {
      return [];
    }

    const chunkIds = indexEntries.map((entry) => entry.relatedChunkId);
    const chunkResults =
      await this.sourceRepository.findContentChunksByIds(chunkIds);

    this.logger.debug(
      { ...logContext, chunkCount: chunkResults.length },
      'Matched source content for vector search',
    );

    return chunkResults.map((result) => result.chunk);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SourceRepository } from '../../ports/source.repository';
import { QueryTextSourceCommand } from './query-text-source.command';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

@Injectable()
export class QueryTextSourceUseCase {
  constructor(
    @InjectPinoLogger(QueryTextSourceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
    private readonly searchContentUseCase: SearchContentUseCase,
  ) {}

  async execute(
    command: QueryTextSourceCommand,
  ): Promise<TextSourceContentChunk[]> {
    const logContext = {
      sourceId: command.filter.sourceId,
      text: command.query,
    };
    this.logger.info({ orgId: command.orgId, ...logContext }, 'execute');
    // Validate input
    if (!command.query || command.query.trim().length === 0) {
      this.logger.warn('Empty query provided for vector search');
      return [];
    }

    try {
      this.logger.debug(logContext, 'Performing vector search');

      // Use the searchContentUseCase to search for relevant content
      const searchQuery = new SearchContentQuery({
        orgId: command.orgId,
        documentId: command.filter.sourceId,
        query: command.query,
        type: IndexType.PARENT_CHILD,
        limit: 50,
      });

      const indexEntries = await this.searchContentUseCase.execute(searchQuery);

      this.logger.debug(
        { ...logContext, entryCount: indexEntries.length },
        'Found index entries for vector search',
      );

      if (indexEntries.length === 0) {
        return [];
      }

      // Fetch all matched chunks in a single query
      const chunkIds = indexEntries.map((entry) => entry.relatedChunkId);
      const chunkResults =
        await this.sourceRepository.findContentChunksByIds(chunkIds);

      this.logger.debug(
        { ...logContext, chunkCount: chunkResults.length },
        'Matched source content for vector search',
      );

      return chunkResults.map((r) => r.chunk);
    } catch (error) {
      this.logger.error(
        { ...logContext, err: error as Error },
        'Error during vector search',
      );
      throw new Error(`Vector search failed`);
    }
  }
}

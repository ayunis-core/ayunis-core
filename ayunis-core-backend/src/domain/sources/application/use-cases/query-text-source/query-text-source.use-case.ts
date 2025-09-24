import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { QueryTextSourceCommand } from './query-text-source.command';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';

@Injectable()
export class QueryTextSourceUseCase {
  private readonly logger = new Logger(QueryTextSourceUseCase.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly searchContentUseCase: SearchContentUseCase,
  ) {}

  async execute(
    command: QueryTextSourceCommand,
  ): Promise<TextSourceContentChunk[]> {
    this.logger.log('execute', command);
    // Validate input
    if (!command.query || command.query.trim().length === 0) {
      this.logger.warn('Empty query provided for vector search');
      return [];
    }

    try {
      this.logger.debug(
        `Performing vector search for query: "${command.query}" in source: ${command.filter.sourceId}`,
      );

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
        `Found ${indexEntries.length} index entries for query: "${command.query}" in source: ${command.filter.sourceId}`,
      );

      // Fetch the actual source content for each index entry
      const sourceContentMatches: TextSourceContentChunk[] = [];

      for (const indexEntry of indexEntries) {
        // Get the source first to access its content
        const source = await this.sourceRepository.findById(
          indexEntry.relatedDocumentId,
        );

        if (source && source instanceof TextSource && source.contentChunks) {
          // Find the specific content chunk by ID
          const sourceContent = source.contentChunks.find(
            (content) => content.id === indexEntry.relatedChunkId,
          );

          if (sourceContent) {
            sourceContentMatches.push(sourceContent);
          } else {
            this.logger.warn(
              `Source content with ID ${indexEntry.relatedChunkId} not found in source ${indexEntry.relatedDocumentId}`,
            );
          }
        } else {
          this.logger.warn(
            `Source with ID ${indexEntry.relatedDocumentId} not found or has no content`,
          );
        }
      }

      this.logger.debug(
        `Successfully matched ${sourceContentMatches.length} source content items for query: "${command.query}" in source: ${command.filter.sourceId}`,
      );

      return sourceContentMatches;
    } catch (error) {
      this.logger.error(
        `Error during vector search for query "${command.query}":`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new Error(`Vector search failed`);
    }
  }
}

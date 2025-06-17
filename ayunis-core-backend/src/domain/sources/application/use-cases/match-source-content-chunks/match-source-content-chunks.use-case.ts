import { Inject, Injectable, Logger } from '@nestjs/common';
import { SourceContentChunk } from '../../../domain/source-content-chunk.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { MatchSourceCommand } from './match-source.command';
import { EmbedTextUseCase } from 'src/domain/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/embeddings/application/use-cases/embed-text/embed-text.command';

@Injectable()
export class MatchSourceContentChunksUseCase {
  private readonly logger = new Logger(MatchSourceContentChunksUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
    private readonly embedTextUseCase: EmbedTextUseCase,
  ) {}

  async execute(command: MatchSourceCommand): Promise<SourceContentChunk[]> {
    // Validate input
    if (!command.query || command.query.trim().length === 0) {
      this.logger.warn('Empty query provided for vector search');
      return [];
    }

    try {
      // Extract options with defaults
      const similarityThreshold = command.options?.similarityThreshold;
      const limit = command.options?.limit;

      this.logger.debug(
        `Performing vector search for query: "${command.query}" in source: ${command.filter.sourceId}`,
      );

      // First, embed the query text to get the query vector
      const queryEmbedding = await this.embedTextUseCase.execute(
        new EmbedTextCommand([command.query]),
      );

      // Now call the repository with the pre-computed vector
      const matches = await this.sourceRepository.matchSourceContentChunks(
        queryEmbedding[0].vector,
        command.filter,
        {
          similarityThreshold,
          limit,
        },
      );
      return matches;
    } catch (error) {
      this.logger.error(
        `Error during vector search for query "${command.query}":`,
        error,
      );
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }
}

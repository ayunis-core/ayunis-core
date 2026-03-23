import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { FindContentChunksByIdsQuery } from './find-content-chunks-by-ids.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import type { UUID } from 'crypto';
import type { TextSourceContentChunk } from '../../../domain/source-content-chunk.entity';

@Injectable()
export class FindContentChunksByIdsUseCase {
  private readonly logger = new Logger(FindContentChunksByIdsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(
    query: FindContentChunksByIdsQuery,
  ): Promise<
    { chunk: TextSourceContentChunk; sourceId: UUID; sourceName: string }[]
  > {
    this.logger.log('execute', { count: query.chunkIds.length });
    try {
      if (query.chunkIds.length === 0) {
        return [];
      }
      return await this.sourceRepository.findContentChunksByIds(query.chunkIds);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding content chunks by IDs', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}

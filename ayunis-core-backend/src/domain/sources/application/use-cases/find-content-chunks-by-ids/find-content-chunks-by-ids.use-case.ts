import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { FindContentChunksByIdsQuery } from './find-content-chunks-by-ids.query';

export interface ContentChunkWithSource {
  chunk: TextSourceContentChunk;
  sourceId: UUID;
  sourceName: string;
}

@Injectable()
export class FindContentChunksByIdsUseCase {
  private readonly logger = new Logger(FindContentChunksByIdsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(
    query: FindContentChunksByIdsQuery,
  ): Promise<ContentChunkWithSource[]> {
    this.logger.log(
      {
        count: query.chunkIds.length,
      },
      'Finding content chunks by IDs',
    );

    try {
      if (query.chunkIds.length === 0) {
        return [];
      }

      return await this.sourceRepository.findContentChunksByIds(query.chunkIds);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding content chunks by IDs',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}

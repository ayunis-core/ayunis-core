import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchMultiContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { QueryTextSourceCommand } from './query-text-source.command';

const MAX_MATCHES_PER_QUERY = 10;
const MAX_TOTAL_MATCHES = 20;

export interface TextSourceQueryResult {
  chunk: TextSourceContentChunk;
  sourceId: UUID;
  sourceName: string;
  sourceCreatedBy: SourceCreator;
  matchedQueries: string[];
}

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
  ): Promise<TextSourceQueryResult[]> {
    const sourceIds = [...new Set(command.sourceIds)];
    this.logger.log(
      { orgId: command.orgId, sourceIds, queryCount: command.queries.length },
      'execute',
    );
    await this.assertSourcesExist(sourceIds);

    const matches = await this.searchContentUseCase.executeMulti(
      new SearchMultiContentQuery({
        orgId: command.orgId,
        documentIds: sourceIds,
        queries: command.queries,
        type: IndexType.PARENT_CHILD,
        limit: MAX_MATCHES_PER_QUERY,
      }),
    );

    return this.resolveResults(matches.slice(0, MAX_TOTAL_MATCHES));
  }

  private async assertSourcesExist(sourceIds: UUID[]): Promise<void> {
    const sources = await Promise.all(
      sourceIds.map((id) => this.sourceRepository.findById(id)),
    );
    const missingIndex = sources.findIndex((source) => !source);
    if (missingIndex !== -1) {
      throw new SourceNotFoundError(sourceIds[missingIndex]);
    }
  }

  private async resolveResults(
    matches: IndexMatch[],
  ): Promise<TextSourceQueryResult[]> {
    if (matches.length === 0) {
      return [];
    }

    const chunkResults = await this.sourceRepository.findContentChunksByIds(
      matches.map((match) => match.entry.relatedChunkId),
    );
    const chunksById = new Map(
      chunkResults.map((result) => [result.chunk.id, result]),
    );

    return matches.flatMap((match) => {
      const result = chunksById.get(match.entry.relatedChunkId);
      return result
        ? [{ ...result, matchedQueries: match.matchedQueries }]
        : [];
    });
  }
}

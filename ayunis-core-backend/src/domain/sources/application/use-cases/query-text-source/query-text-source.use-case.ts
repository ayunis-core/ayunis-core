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
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
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
    // Only READY sources are indexed with the org's current model; one being
    // re-indexed would be compared against vectors of another model.
    const readySourceIds = (await this.findExistingSources(sourceIds))
      .filter((source) => source.status === SourceStatus.READY)
      .map((source) => source.id);
    if (readySourceIds.length === 0) return [];

    const matches = await this.searchContentUseCase.executeMulti(
      new SearchMultiContentQuery({
        orgId: command.orgId,
        documentIds: readySourceIds,
        queries: command.queries,
        type: IndexType.PARENT_CHILD,
        limit: MAX_MATCHES_PER_QUERY,
      }),
    );

    return this.resolveResults(matches.slice(0, MAX_TOTAL_MATCHES));
  }

  private async findExistingSources(sourceIds: UUID[]): Promise<Source[]> {
    const sources = await Promise.all(
      sourceIds.map((id) => this.sourceRepository.findById(id)),
    );
    return sources.map((source, index) => {
      if (!source) throw new SourceNotFoundError(sourceIds[index]);
      return source;
    });
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

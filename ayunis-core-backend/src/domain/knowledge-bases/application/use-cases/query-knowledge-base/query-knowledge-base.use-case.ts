import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { QueryKnowledgeBaseQuery } from './query-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchMultiContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { FindContentChunksByIdsUseCase } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import { FindContentChunksByIdsQuery } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.query';

export interface KnowledgeBaseQueryResult {
  chunk: TextSourceContentChunk;
  sourceName: string;
  sourceId: string;
}

@Injectable()
export class QueryKnowledgeBaseUseCase {
  private readonly logger = new Logger(QueryKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly findContentChunksByIdsUseCase: FindContentChunksByIdsUseCase,
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly contextService: ContextService,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
  ) {}

  async execute(
    query: QueryKnowledgeBaseQuery,
  ): Promise<KnowledgeBaseQueryResult[]> {
    try {
      return await this.executeInternal(query);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error querying knowledge base',
      );
      throw new UnexpectedKnowledgeBaseError('Error querying knowledge base', {
        err: error as Error,
      });
    }
  }

  private async executeInternal(
    query: QueryKnowledgeBaseQuery,
  ): Promise<KnowledgeBaseQueryResult[]> {
    const orgId = this.contextService.get('orgId');

    this.logger.debug(
      {
        knowledgeBaseId: query.knowledgeBaseId,
      },
      'Querying knowledge base',
    );

    const knowledgeBase =
      await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
        query.knowledgeBaseId,
      );

    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }

    // Sources are now metadata-only (no text or chunks loaded)
    const sources =
      await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
        query.knowledgeBaseId,
      );

    if (sources.length === 0) {
      return [];
    }

    const documentIds = sources.map((source) => source.id);

    const indexEntries = await this.searchContentUseCase.executeMulti(
      new SearchMultiContentQuery({
        orgId,
        query: query.query,
        documentIds,
        type: IndexType.PARENT_CHILD,
        limit: 5,
      }),
    );

    return this.resolveResults(indexEntries);
  }

  private async resolveResults(
    indexEntries: IndexEntry[],
  ): Promise<KnowledgeBaseQueryResult[]> {
    if (indexEntries.length === 0) {
      return [];
    }

    const chunkIds = indexEntries.map((entry) => entry.relatedChunkId);
    const chunkResults = await this.findContentChunksByIdsUseCase.execute(
      new FindContentChunksByIdsQuery(chunkIds),
    );
    const chunkMap = new Map(
      chunkResults.map((result) => [result.chunk.id, result]),
    );
    const results = indexEntries.flatMap((entry) => {
      const match = chunkMap.get(entry.relatedChunkId);
      return match
        ? [
            {
              chunk: match.chunk,
              sourceName: match.sourceName,
              sourceId: match.sourceId,
            },
          ]
        : [];
    });

    this.logger.debug(
      { resultCount: results.length },
      'Found results for knowledge base query',
    );
    return results;
  }
}

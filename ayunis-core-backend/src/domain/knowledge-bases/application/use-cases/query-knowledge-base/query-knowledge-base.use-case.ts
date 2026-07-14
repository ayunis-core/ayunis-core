import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { QueryKnowledgeBaseQuery } from './query-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchMultiContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseAccessService } from '../../services/knowledge-base-access.service';
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

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: QueryKnowledgeBaseQuery,
  ): Promise<KnowledgeBaseQueryResult[]> {
    const orgId = this.contextService.get('orgId');

    this.logger.debug('Querying knowledge base', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

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

    if (indexEntries.length === 0) {
      return [];
    }

    const results = await this.resolveChunks(indexEntries);

    this.logger.debug(
      `Found ${results.length} results for knowledge base query`,
    );

    return results;
  }

  private async resolveChunks(
    indexEntries: IndexEntry[],
  ): Promise<KnowledgeBaseQueryResult[]> {
    // Fetch only the matched chunks by ID (single query)
    const chunkIds = indexEntries.map((entry) => entry.relatedChunkId);
    const chunkResults = await this.findContentChunksByIdsUseCase.execute(
      new FindContentChunksByIdsQuery(chunkIds),
    );

    // Build a lookup map for quick access
    const chunkMap = new Map(chunkResults.map((r) => [r.chunk.id, r]));

    const results: KnowledgeBaseQueryResult[] = [];

    for (const entry of indexEntries) {
      const match = chunkMap.get(entry.relatedChunkId);
      if (match) {
        results.push({
          chunk: match.chunk,
          sourceName: match.sourceName,
          sourceId: match.sourceId,
        });
      }
    }

    return results;
  }
}

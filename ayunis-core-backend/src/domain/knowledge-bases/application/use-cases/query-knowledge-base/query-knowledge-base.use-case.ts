import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { QueryKnowledgeBaseQuery } from './query-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchMultiContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { FindKnowledgeBaseForThreadUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base-for-thread/find-knowledge-base-for-thread.use-case';
import { FindContentChunksByIdsUseCase } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import { FindContentChunksByIdsQuery } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.query';
import type { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import type { UUID } from 'crypto';

const MAX_MATCHES_PER_QUERY = 10;
const MAX_TOTAL_MATCHES = 20;

export interface KnowledgeBaseQueryResult {
  chunk: TextSourceContentChunk;
  sourceName: string;
  sourceId: string;
  sourceCreatedBy: SourceCreator;
  matchedQueries: string[];
}

@Injectable()
export class QueryKnowledgeBaseUseCase {
  private readonly logger = new Logger(QueryKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly findContentChunksByIdsUseCase: FindContentChunksByIdsUseCase,
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly contextService: ContextService,
    private readonly findKnowledgeBaseForThread: FindKnowledgeBaseForThreadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: QueryKnowledgeBaseQuery,
  ): Promise<KnowledgeBaseQueryResult[]> {
    return await this.executeInternal(query);
  }

  private async executeInternal(
    query: QueryKnowledgeBaseQuery,
  ): Promise<KnowledgeBaseQueryResult[]> {
    const orgId = getRequiredOrgId(this.contextService);
    const knowledgeBaseIds = [...new Set(query.knowledgeBaseIds)];

    this.logger.debug({ knowledgeBaseIds }, 'Querying knowledge bases');

    await Promise.all(
      knowledgeBaseIds.map((knowledgeBaseId) =>
        this.assertAccessible(knowledgeBaseId, orgId, query.threadId),
      ),
    );

    // Sources are now metadata-only (no text or chunks loaded)
    const sources =
      await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseIds(
        knowledgeBaseIds,
      );

    if (sources.length === 0) {
      return [];
    }

    const matches = await this.searchContentUseCase.executeMulti(
      new SearchMultiContentQuery({
        orgId,
        queries: query.queries,
        documentIds: sources.map((source) => source.id),
        type: IndexType.PARENT_CHILD,
        limit: MAX_MATCHES_PER_QUERY,
      }),
    );

    return this.resolveResults(matches.slice(0, MAX_TOTAL_MATCHES));
  }

  private async assertAccessible(
    knowledgeBaseId: UUID,
    orgId: UUID,
    threadId: UUID | undefined,
  ): Promise<void> {
    const knowledgeBase = await this.findKnowledgeBaseForThread.execute({
      knowledgeBaseId,
      threadId,
    });
    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
  }

  private async resolveResults(
    matches: IndexMatch[],
  ): Promise<KnowledgeBaseQueryResult[]> {
    if (matches.length === 0) {
      return [];
    }

    const chunkIds = matches.map((match) => match.entry.relatedChunkId);
    const chunkResults = await this.findContentChunksByIdsUseCase.execute(
      new FindContentChunksByIdsQuery(chunkIds),
    );
    const chunkMap = new Map(
      chunkResults.map((result) => [result.chunk.id, result]),
    );
    const results = matches.flatMap((match) => {
      const result = chunkMap.get(match.entry.relatedChunkId);
      return result
        ? [
            {
              chunk: result.chunk,
              sourceName: result.sourceName,
              sourceId: result.sourceId,
              sourceCreatedBy: result.sourceCreatedBy,
              matchedQueries: match.matchedQueries,
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

import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { QueryKnowledgeBaseQuery } from './query-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { SearchMultiContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { UUID } from 'crypto';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';

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
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly contextService: ContextService,
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
      this.logger.error('Error querying knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Error querying knowledge base', {
        error: error as Error,
      });
    }
  }

  private async executeInternal(
    query: QueryKnowledgeBaseQuery,
  ): Promise<KnowledgeBaseQueryResult[]> {
    const orgId = this.contextService.get('orgId');

    this.logger.debug('Querying knowledge base', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

    const knowledgeBase = await this.knowledgeBaseRepository.findById(
      query.knowledgeBaseId,
    );
    if (knowledgeBase?.userId !== query.userId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }

    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }

    // Sources are loaded with content chunks in a single query via TypeORM
    // eager loading: SourceRecord → TextSourceDetailsRecord → contentChunks.
    const sources =
      await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
        query.knowledgeBaseId,
      );

    if (sources.length === 0) {
      return [];
    }

    const sourceMap = this.buildSourceMap(sources);
    const documentIds = sources.map((source) => source.id);

    const indexEntries = await this.searchContentUseCase.executeMulti(
      new SearchMultiContentQuery({
        orgId,
        query: query.query,
        documentIds,
        type: IndexType.PARENT_CHILD,
        limit: 50,
      }),
    );

    const results: KnowledgeBaseQueryResult[] = [];

    for (const entry of indexEntries) {
      const source = sourceMap.get(entry.relatedDocumentId);

      if (source && source instanceof TextSource) {
        const chunk = source.contentChunks.find(
          (c) => c.id === entry.relatedChunkId,
        );

        if (chunk) {
          results.push({
            chunk,
            sourceName: source.name,
            sourceId: source.id,
          });
        }
      }
    }

    this.logger.debug(
      `Found ${results.length} results for knowledge base query`,
    );

    return results;
  }

  private buildSourceMap(sources: Source[]): Map<UUID, Source> {
    const map = new Map<UUID, Source>();
    for (const source of sources) {
      map.set(source.id, source);
    }
    return map;
  }
}

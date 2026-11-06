import { Injectable, Logger } from '@nestjs/common';
import type { SearchMultiInput } from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import {
  ParentChildIndexerRepositoryPort,
  ScoredParentChunk,
} from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import type { UUID } from 'crypto';
import type { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';

interface MergedMatch {
  parentChunk: ParentChunk;
  distance: number;
  matchedQueries: string[];
}

@Injectable()
export class SearchContentUseCase {
  private readonly logger = new Logger(SearchContentUseCase.name);

  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  async executeMulti(input: SearchMultiInput): Promise<IndexMatch[]> {
    const queries = [
      ...new Set(input.queries.map((query) => query.trim()).filter(Boolean)),
    ];
    if (input.documentIds.length === 0 || queries.length === 0) {
      return [];
    }
    const queryVectors = await this.embedQueries(input.orgId, queries);
    const resultsPerQuery = await Promise.all(
      queryVectors.map((queryVector) =>
        this.parentChildIndexerRepository.findByDocumentIds(
          queryVector,
          input.documentIds,
          input.filter?.limit,
        ),
      ),
    );
    return this.mergeByChunk(queries, resultsPerQuery);
  }

  private async embedQueries(
    orgId: UUID,
    queries: string[],
  ): Promise<number[][]> {
    this.logger.debug(
      { orgId, queryCount: queries.length },
      'Embedding queries for search',
    );
    const model = await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId }),
    );
    const embeddings = await this.embedTextUseCase.execute(
      new EmbedTextCommand({
        model: model.model,
        texts: queries,
        orgId,
        // Chat-query embed — jump ahead of ingestion on the shared throttle.
        priority: EmbeddingPriority.RETRIEVAL,
      }),
    );
    return embeddings.map((embedding) => embedding.vector);
  }

  private mergeByChunk(
    queries: string[],
    resultsPerQuery: ScoredParentChunk[][],
  ): IndexMatch[] {
    const byChunkId = new Map<UUID, MergedMatch>();
    resultsPerQuery.forEach((results, queryIndex) => {
      const query = queries[queryIndex];
      for (const { parentChunk, distance } of results) {
        const existing = byChunkId.get(parentChunk.relatedChunkId);
        if (!existing) {
          byChunkId.set(parentChunk.relatedChunkId, {
            parentChunk,
            distance,
            matchedQueries: [query],
          });
          continue;
        }
        if (!existing.matchedQueries.includes(query)) {
          existing.matchedQueries.push(query);
        }
        if (distance < existing.distance) {
          existing.parentChunk = parentChunk;
          existing.distance = distance;
        }
      }
    });

    return [...byChunkId.values()]
      .sort((a, b) => a.distance - b.distance)
      .map(
        ({ parentChunk, matchedQueries }) =>
          new IndexMatch({
            entry: new IndexEntry({
              id: parentChunk.id,
              relatedDocumentId: parentChunk.relatedDocumentId,
              relatedChunkId: parentChunk.relatedChunkId,
              createdAt: parentChunk.createdAt,
              updatedAt: parentChunk.updatedAt,
            }),
            matchedQueries,
          }),
      );
  }
}

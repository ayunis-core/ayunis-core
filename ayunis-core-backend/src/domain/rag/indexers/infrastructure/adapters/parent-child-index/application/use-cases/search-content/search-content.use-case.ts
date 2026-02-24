import { Injectable, Logger } from '@nestjs/common';
import type {
  SearchInput,
  SearchMultiInput,
} from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { ParentChildIndexerRepositoryPort } from '../../ports/parent-child-indexer-repository.port';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import type { UUID } from 'crypto';
import type { ParentChunk } from '../../../domain/parent-chunk.entity';

@Injectable()
export class SearchContentUseCase {
  private readonly logger = new Logger(SearchContentUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  async execute(input: SearchInput): Promise<IndexEntry[]> {
    const queryVector = await this.embedQuery(input.orgId, input.query);
    const parentChunks = await this.parentChildIndexerRepository.find(
      queryVector,
      input.documentId,
      input.filter?.limit,
    );
    return this.toIndexEntries(parentChunks);
  }

  async executeMulti(input: SearchMultiInput): Promise<IndexEntry[]> {
    if (input.documentIds.length === 0) {
      return [];
    }
    const queryVector = await this.embedQuery(input.orgId, input.query);
    const parentChunks =
      await this.parentChildIndexerRepository.findByDocumentIds(
        queryVector,
        input.documentIds,
        input.filter?.limit,
      );
    return this.toIndexEntries(parentChunks);
  }

  private async embedQuery(orgId: UUID, query: string): Promise<number[]> {
    this.logger.debug('Embedding query for search', { orgId });
    const model = await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId }),
    );
    const embeddedQuery = await this.embedTextUseCase.execute(
      new EmbedTextCommand({
        model: model.model,
        texts: [query],
        orgId,
      }),
    );
    this.logger.debug('Embedded query', {
      vectorLength: embeddedQuery[0].vector.length,
    });
    return embeddedQuery[0].vector;
  }

  private toIndexEntries(parentChunks: ParentChunk[]): IndexEntry[] {
    return parentChunks.map(
      (parentChunk) =>
        new IndexEntry({
          id: parentChunk.id,
          relatedDocumentId: parentChunk.relatedDocumentId,
          relatedChunkId: parentChunk.relatedChunkId,
          createdAt: parentChunk.createdAt,
          updatedAt: parentChunk.updatedAt,
        }),
    );
  }
}

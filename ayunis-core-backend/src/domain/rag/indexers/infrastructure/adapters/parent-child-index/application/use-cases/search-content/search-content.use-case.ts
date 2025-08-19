import { Injectable, Logger } from '@nestjs/common';
import { SearchInput } from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { ParentChildIndexerRepositoryPort } from '../../ports/parent-child-indexer-repository.port';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';

@Injectable()
export class SearchContentUseCase {
  private readonly logger = new Logger(SearchContentUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  async execute(input: SearchInput): Promise<IndexEntry[]> {
    this.logger.debug('search content', {
      input,
    });
    const model = await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId: input.orgId }),
    );
    const embeddedQuery = await this.embedTextUseCase.execute(
      new EmbedTextCommand({
        model: model.model,
        texts: [input.query],
        orgId: input.orgId,
      }),
    );
    this.logger.debug('embedded query', {
      vectorLength: embeddedQuery[0].vector.length,
    });
    const parentChunks = await this.parentChildIndexerRepository.find(
      embeddedQuery[0].vector,
      input.documentId,
    );
    return parentChunks.map((parentChunk) => {
      return new IndexEntry({
        id: parentChunk.id,
        relatedDocumentId: parentChunk.relatedDocumentId,
        relatedChunkId: parentChunk.relatedChunkId,
        createdAt: parentChunk.createdAt,
        updatedAt: parentChunk.updatedAt,
      });
    });
  }
}

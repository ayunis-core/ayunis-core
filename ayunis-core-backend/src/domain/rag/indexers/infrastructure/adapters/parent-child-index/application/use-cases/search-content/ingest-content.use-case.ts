import { Injectable } from '@nestjs/common';
import { SearchInput } from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { ParentChildIndexerRepositoryPort } from '../../ports/parent-child-indexer-repository.port';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';

@Injectable()
export class SearchContentUseCase {
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly embedTextUseCase: EmbedTextUseCase,
  ) {}

  async execute(input: SearchInput): Promise<IndexEntry[]> {
    const embeddedQuery = await this.embedTextUseCase.execute(
      new EmbedTextCommand([input.query]),
    );
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

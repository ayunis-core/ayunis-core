import { Injectable } from '@nestjs/common';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { ParentChildIndexerRepositoryPort } from '../../ports/parent-child-indexer-repository.port';
import { ParentChunk } from '../../../domain/parent-chunk.entity';
import { ProcessTextUseCase } from 'src/domain/rag/splitters/application/use-cases/process-text/process-text.use-case';
import { ProcessTextCommand } from 'src/domain/rag/splitters/application/use-cases/process-text/process-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { ChildChunk } from '../../../domain/child-chunk.entity';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';

@Injectable()
export class IngestContentUseCase {
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly processTextUseCase: ProcessTextUseCase,
    private readonly embedTextUseCase: EmbedTextUseCase,
  ) {}

  async execute(input: IndexEntry, content: string): Promise<void> {
    await this.parentChildIndexerRepository.delete(input.relatedDocumentId);
    const textChunks = this.processTextUseCase.execute(
      new ProcessTextCommand(content, SplitterType.RECURSIVE),
    );
    const embeddings = await this.embedTextUseCase.execute(
      new EmbedTextCommand(textChunks.chunks.map((chunk) => chunk.text)),
    );
    const childChunks = embeddings.map((embedding) => {
      return new ChildChunk({
        embedding: embedding.vector,
        parentId: input.relatedDocumentId,
      });
    });
    const parentChunk = new ParentChunk({
      relatedDocumentId: input.relatedDocumentId,
      relatedChunkId: input.relatedChunkId,
      children: childChunks,
    });
    await this.parentChildIndexerRepository.save(parentChunk);
  }
}

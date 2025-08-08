import { Injectable, Logger } from '@nestjs/common';
import { ParentChildIndexerRepositoryPort } from '../../ports/parent-child-indexer-repository.port';
import { ParentChunk } from '../../../domain/parent-chunk.entity';
import { ProcessTextUseCase } from 'src/domain/rag/splitters/application/use-cases/process-text/process-text.use-case';
import { ProcessTextCommand } from 'src/domain/rag/splitters/application/use-cases/process-text/process-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { ChildChunk } from '../../../domain/child-chunk.entity';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { IngestContentCommand } from './ingest-content.command';

@Injectable()
export class IngestContentUseCase {
  private readonly logger = new Logger(IngestContentUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly processTextUseCase: ProcessTextUseCase,
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  async execute(command: IngestContentCommand): Promise<void> {
    this.logger.debug('ingest content', {
      command,
    });
    await this.parentChildIndexerRepository.delete(
      command.indexEntry.relatedDocumentId,
    );
    const textChunks = this.processTextUseCase.execute(
      new ProcessTextCommand(command.content, SplitterType.RECURSIVE),
    );
    const model = await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({
        orgId: command.orgId,
      }),
    );
    const embeddings = await this.embedTextUseCase.execute(
      new EmbedTextCommand({
        texts: textChunks.chunks.map((chunk) => chunk.text),
        model: model.model,
        orgId: command.orgId,
      }),
    );
    const childChunks = embeddings.map((embedding) => {
      this.logger.debug('child chunk', {
        vectorLength: embedding.vector.length,
      });
      return new ChildChunk({
        embedding: embedding.vector,
        parentId: command.indexEntry.relatedDocumentId,
      });
    });
    const parentChunk = new ParentChunk({
      relatedDocumentId: command.indexEntry.relatedDocumentId,
      relatedChunkId: command.indexEntry.relatedChunkId,
      children: childChunks,
      content: command.content,
    });
    await this.parentChildIndexerRepository.save(parentChunk);
  }
}

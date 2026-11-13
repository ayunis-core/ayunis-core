import { Injectable, Logger } from '@nestjs/common';
import { ParentChildIndexerRepositoryPort } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';
import { ChildChunkEmbedder } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/services/child-chunk-embedder.service';
import { ChildChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/child-chunk.entity';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { IngestBulkContentCommand } from './ingest-bulk-content.command';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';

@Injectable()
export class IngestBulkContentUseCase {
  private readonly logger = new Logger(IngestBulkContentUseCase.name);

  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly embedder: ChildChunkEmbedder,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  async execute(command: IngestBulkContentCommand): Promise<void> {
    if (command.entries.length === 0) return;

    this.logger.debug(
      { entryCount: command.entries.length, orgId: command.orgId },
      'Bulk ingesting entries',
    );

    // 1. Resolve embedding model ONCE for the entire batch
    const permittedModel = await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId: command.orgId }),
    );

    // 2. Split all entries into child chunks, tracking parent ownership
    const parentPlans = this.buildParentPlans(command);

    // 3. Collect all child texts into a flat list for batched embedding
    const allChildTexts = parentPlans.flatMap((plan) => plan.childTexts);

    this.logger.debug(
      {
        entryCount: command.entries.length,
        parentChunkCount: parentPlans.length,
        childTextCount: allChildTexts.length,
      },
      'Split entries into chunks',
    );

    // 4. Embed all child texts in batches
    const allEmbeddings = await this.embedMissing(
      allChildTexts,
      permittedModel.model,
      command,
    );

    // 5. Reassemble parent chunks with their embeddings
    const parentChunks = this.assembleParentChunks(parentPlans, allEmbeddings);

    // 6. Bulk save all parent chunks
    await this.parentChildIndexerRepository.saveMany(parentChunks);

    this.logger.debug(
      {
        parentChunkCount: parentChunks.length,
        childEmbeddingCount: allChildTexts.length,
      },
      'Bulk ingested chunks',
    );
  }

  private buildParentPlans(command: IngestBulkContentCommand): ParentPlan[] {
    return command.entries.map((entry) => {
      const parentId = randomUUID();
      return {
        parentId,
        relatedDocumentId: entry.indexEntry.relatedDocumentId,
        relatedChunkId: entry.indexEntry.relatedChunkId,
        content: entry.content,
        childTexts: this.embedder.childTexts(entry.content),
      };
    });
  }

  // Texts whose vectors the caller computed ahead of the ingestion are not
  // sent again; the result keeps the order of the texts.
  private async embedMissing(
    texts: string[],
    model: EmbeddingModel,
    command: IngestBulkContentCommand,
  ): Promise<number[][]> {
    const known = command.precomputedEmbeddings?.matchesModel(model)
      ? command.precomputedEmbeddings.vectorsByText
      : undefined;
    const missing = texts.filter((text) => !known?.has(text));
    const embedded = await this.embedder.embed(missing, model, command.orgId);
    let next = 0;
    return texts.map((text) => known?.get(text) ?? embedded[next++]);
  }

  private assembleParentChunks(
    plans: ParentPlan[],
    allEmbeddings: number[][],
  ): ParentChunk[] {
    let embeddingOffset = 0;
    return plans.map((plan) => {
      const childChunks = plan.childTexts.map(() => {
        const chunk = new ChildChunk({
          embedding: allEmbeddings[embeddingOffset],
          parentId: plan.parentId,
        });
        embeddingOffset++;
        return chunk;
      });
      return new ParentChunk({
        id: plan.parentId,
        relatedDocumentId: plan.relatedDocumentId,
        relatedChunkId: plan.relatedChunkId,
        content: plan.content,
        children: childChunks,
      });
    });
  }
}

interface ParentPlan {
  parentId: UUID;
  relatedDocumentId: UUID;
  relatedChunkId: UUID;
  content: string;
  childTexts: string[];
}

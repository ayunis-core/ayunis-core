import { Injectable, Logger } from '@nestjs/common';
import { ParentChildIndexerRepositoryPort } from '../../ports/parent-child-indexer-repository.port';
import { ParentChunk } from '../../../domain/parent-chunk.entity';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { ChildChunk } from '../../../domain/child-chunk.entity';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { IngestBulkContentCommand } from './ingest-bulk-content.command';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';

/**
 * Maximum number of texts to send in a single embedding API call.
 *
 * Child chunks are up to ~1000 chars (~250 tokens) each, so this batch size
 * yields ~16k tokens per request — well within all provider limits:
 *   - Mistral: error 3210 "Too many tokens" at ~256 × 1000-char chunks;
 *     64 chunks (~16k tokens) is safe with headroom.
 *   - OpenAI: max 300k total tokens per request — 64 chunks is far below.
 *   - Ollama: no documented limit.
 */
const EMBEDDING_BATCH_SIZE = 64;

@Injectable()
export class IngestBulkContentUseCase {
  private readonly logger = new Logger(IngestBulkContentUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepositoryPort,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
  ) {}

  async execute(command: IngestBulkContentCommand): Promise<void> {
    if (command.entries.length === 0) return;

    this.logger.debug(
      `Bulk ingesting ${command.entries.length} entries for org ${command.orgId}`,
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
      `Split ${command.entries.length} entries into ` +
        `${parentPlans.length} parent chunks with ${allChildTexts.length} child texts total`,
    );

    // 4. Embed all child texts in batches
    const allEmbeddings = await this.embedInBatches(
      allChildTexts,
      permittedModel.model,
      command.orgId,
    );

    // 5. Reassemble parent chunks with their embeddings
    const parentChunks = this.assembleParentChunks(parentPlans, allEmbeddings);

    // 6. Bulk save all parent chunks
    await this.parentChildIndexerRepository.saveMany(parentChunks);

    this.logger.debug(
      `Bulk ingested ${parentChunks.length} parent chunks ` +
        `with ${allChildTexts.length} child embeddings`,
    );
  }

  private buildParentPlans(command: IngestBulkContentCommand): ParentPlan[] {
    return command.entries.map((entry) => {
      const splitResult = this.splitTextUseCase.execute(
        new SplitTextCommand(entry.content, SplitterType.RECURSIVE),
      );
      const parentId = randomUUID();
      return {
        parentId,
        relatedDocumentId: entry.indexEntry.relatedDocumentId,
        relatedChunkId: entry.indexEntry.relatedChunkId,
        content: entry.content,
        childTexts: splitResult.chunks.map((chunk) => chunk.text),
      };
    });
  }

  private async embedInBatches(
    texts: string[],
    model: EmbeddingModel,
    orgId: UUID,
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allVectors: number[][] = [];

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      const embeddings = await this.embedTextUseCase.execute(
        new EmbedTextCommand({ texts: batch, model, orgId }),
      );
      for (const embedding of embeddings) {
        allVectors.push(embedding.vector);
      }
    }

    return allVectors;
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

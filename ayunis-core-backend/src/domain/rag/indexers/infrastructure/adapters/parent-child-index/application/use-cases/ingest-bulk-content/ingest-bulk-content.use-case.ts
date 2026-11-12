import { Injectable, Logger } from '@nestjs/common';
import { ParentChildIndexerRepositoryPort } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { ChildChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/child-chunk.entity';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
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

/**
 * Embedding requests one ingestion keeps in flight. Sent one after another, a
 * 660-page PDF spent 75 s of its 110 s here (AYC-1803). Half of the process-wide
 * throttle (EMBEDDINGS_MAX_CONCURRENCY, default 16), so one long document
 * leaves slots for other documents and, where the API ingests too, for chat
 * queries: the throttle ranks those first but cannot interrupt a running call.
 */
const EMBEDDING_BATCH_CONCURRENCY = 8;

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
      {
        parentChunkCount: parentChunks.length,
        childEmbeddingCount: allChildTexts.length,
      },
      'Bulk ingested chunks',
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
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      batches.push(texts.slice(i, i + EMBEDDING_BATCH_SIZE));
    }

    const vectors: number[][][] = [];
    const failures: unknown[] = [];
    let next = 0;
    // After a failure no further batch is sent, and the ingestion fails only
    // once the batches already sent have returned: the queue retries the job
    // within seconds, and requests still running from this attempt would
    // spend the provider's capacity on vectors nobody stores.
    const sendBatches = async (): Promise<void> => {
      while (failures.length === 0 && next < batches.length) {
        const index = next++;
        try {
          vectors[index] = await this.embedBatch(batches[index], model, orgId);
        } catch (error) {
          failures.push(error);
        }
      }
    };
    await Promise.all(
      Array.from({ length: EMBEDDING_BATCH_CONCURRENCY }, sendBatches),
    );
    if (failures.length > 0) throw failures[0];
    return vectors.flat();
  }

  private async embedBatch(
    texts: string[],
    model: EmbeddingModel,
    orgId: UUID,
  ): Promise<number[][]> {
    const embeddings = await this.embedTextUseCase.execute(
      new EmbedTextCommand({
        texts,
        model,
        orgId,
        priority: EmbeddingPriority.INGESTION,
      }),
    );
    return embeddings.map((embedding) => embedding.vector);
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

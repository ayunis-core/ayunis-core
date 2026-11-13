import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { DEFAULT_EMBEDDINGS_MAX_CONCURRENCY } from 'src/config/embeddings.config';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';

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
 * Cuts a parent chunk into the child texts that get embedded and embeds
 * them. Shared by ingestion and by the embedding done ahead of it, which
 * must produce exactly the texts ingestion will ask for.
 */
@Injectable()
export class ChildChunkEmbedder {
  constructor(
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly configService: ConfigService,
  ) {}

  childTexts(content: string): string[] {
    return this.splitTextUseCase
      .execute(new SplitTextCommand(content, SplitterType.RECURSIVE))
      .chunks.map((chunk) => chunk.text);
  }

  async embed(
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
    // After a failure no further batch is sent, and the caller fails only
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
      Array.from({ length: this.batchesInFlight() }, sendBatches),
    );
    if (failures.length > 0) throw failures[0];
    return vectors.flat();
  }

  // One caller may use the whole process-wide embeddings throttle
  // (EMBEDDINGS_MAX_CONCURRENCY). Sent one after another, a 660-page PDF
  // spent 75 s of its 110 s on embedding (AYC-1803); 60 batches took 12 s at
  // eight and 7 s at sixteen against the provider, with single calls no
  // slower. A chat query waiting behind a long document still goes first
  // when a slot frees, about one call later.
  private batchesInFlight(): number {
    return (
      this.configService.get<number>('embeddings.throttle.maxConcurrency') ??
      DEFAULT_EMBEDDINGS_MAX_CONCURRENCY
    );
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
}

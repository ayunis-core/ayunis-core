import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';
import { DEFAULT_EMBEDDINGS_MAX_CONCURRENCY } from 'src/config/embeddings.config';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

/**
 * Structural slice of p-queue's API that we depend on. Declaring it locally
 * keeps the service unit-testable (a fake can be substituted).
 */
export interface PriorityQueue {
  add<T>(
    fn: () => Promise<T>,
    options: { priority: number },
  ): Promise<T | void>;
}

// p-queue runs higher-priority queued tasks first, so retrieval must rank
// above ingestion and ingestion above re-indexing. The absolute values don't
// matter, only the ordering.
const QUEUE_PRIORITY: Record<EmbeddingPriority, number> = {
  [EmbeddingPriority.RETRIEVAL]: 1,
  [EmbeddingPriority.INGESTION]: 0,
  [EmbeddingPriority.REINDEXING]: -1,
};

/**
 * Global throttle for every embedding API call in the process.
 *
 * All embedding traffic — document/URL ingestion and chat-query retrieval —
 * funnels through {@link EmbedTextUseCase} into a single shared queue with a
 * bounded concurrency. Callers tag each request with an {@link EmbeddingPriority}
 * so retrieval embeds jump ahead of ingestion embeds, and ingestion ahead of
 * re-indexing: a heavy workload from one org can never starve chat search or
 * uploads for other orgs. Requests
 * over the cap **wait** in the queue rather than being rejected.
 */
@Injectable()
export class EmbeddingsThrottleService {
  private readonly logger = new Logger(EmbeddingsThrottleService.name);

  private sharedQueue: PriorityQueue | null = null;

  constructor(private readonly configService: ConfigService) {}

  run<T>(priority: EmbeddingPriority, fn: () => Promise<T>): Promise<T> {
    const queue = this.getQueue();
    return queue.add(fn, { priority: QUEUE_PRIORITY[priority] }) as Promise<T>;
  }

  private getQueue(): PriorityQueue {
    // Memoize so every embedding call shares one queue (one concurrency budget).
    this.sharedQueue ??= this.createQueue();
    return this.sharedQueue;
  }

  /** Builds the shared p-queue. `protected` so tests can substitute a fake. */
  protected createQueue(): PriorityQueue {
    const concurrency =
      this.configService.get<number>('embeddings.throttle.maxConcurrency') ??
      DEFAULT_EMBEDDINGS_MAX_CONCURRENCY;
    this.logger.log({ concurrency }, 'Embeddings throttle initialized');
    return new PQueue({ concurrency });
  }
}

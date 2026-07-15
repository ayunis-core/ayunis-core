import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';
import { EmbeddingPriority } from '../../domain/embedding-priority.enum';

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

const DEFAULT_MAX_CONCURRENCY = 16;
// p-queue runs higher-priority queued tasks first, so retrieval must rank
// above ingestion. The absolute values don't matter, only the ordering.
const RETRIEVAL_PRIORITY = 1;
const INGESTION_PRIORITY = 0;

/**
 * Global throttle for every embedding API call in the process.
 *
 * All embedding traffic — document/URL ingestion and chat-query retrieval —
 * funnels through {@link EmbedTextUseCase} into a single shared queue with a
 * bounded concurrency. Callers tag each request with an {@link EmbeddingPriority}
 * so retrieval embeds jump ahead of ingestion embeds: a heavy ingestion
 * workload from one org can never starve chat search for other orgs. Requests
 * over the cap **wait** in the queue rather than being rejected.
 */
@Injectable()
export class EmbeddingsThrottleService {
  private readonly logger = new Logger(EmbeddingsThrottleService.name);
  private sharedQueue: PriorityQueue | null = null;

  constructor(private readonly configService: ConfigService) {}

  run<T>(priority: EmbeddingPriority, fn: () => Promise<T>): Promise<T> {
    const queue = this.getQueue();
    const queuePriority =
      priority === EmbeddingPriority.RETRIEVAL
        ? RETRIEVAL_PRIORITY
        : INGESTION_PRIORITY;
    return queue.add(fn, { priority: queuePriority }) as Promise<T>;
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
      DEFAULT_MAX_CONCURRENCY;
    this.logger.log('Embeddings throttle initialized', { concurrency });
    return new PQueue({ concurrency });
  }
}

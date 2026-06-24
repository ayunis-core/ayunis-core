import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingPriority } from '../../domain/embedding-priority.enum';

/**
 * Structural slice of p-queue's API that we depend on. Declaring it locally
 * keeps the service unit-testable (a fake can be substituted) and avoids a
 * type-level import of the ESM-only package.
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
  private queuePromise: Promise<PriorityQueue> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async run<T>(priority: EmbeddingPriority, fn: () => Promise<T>): Promise<T> {
    const queue = await this.getQueue();
    const queuePriority =
      priority === EmbeddingPriority.RETRIEVAL
        ? RETRIEVAL_PRIORITY
        : INGESTION_PRIORITY;
    return queue.add(fn, { priority: queuePriority }) as Promise<T>;
  }

  private getQueue(): Promise<PriorityQueue> {
    // Memoize so every embedding call shares one queue (one concurrency budget).
    this.queuePromise ??= this.createQueue();
    return this.queuePromise;
  }

  /**
   * Builds the shared p-queue. `protected` so tests can substitute a fake —
   * p-queue is ESM-only and the dynamic import cannot run under the repo's
   * CommonJS jest config (it works at runtime under Node's require-of-ESM,
   * the same pattern already used for p-limit elsewhere).
   */
  protected async createQueue(): Promise<PriorityQueue> {
    const concurrency =
      this.configService.get<number>('embeddings.throttle.maxConcurrency') ??
      DEFAULT_MAX_CONCURRENCY;
    const { default: PQueue } = await import('p-queue');
    this.logger.log('Embeddings throttle initialized', { concurrency });
    return new PQueue({ concurrency });
  }
}

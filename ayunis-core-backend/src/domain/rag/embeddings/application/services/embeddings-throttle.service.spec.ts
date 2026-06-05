import type { ConfigService } from '@nestjs/config';
import {
  EmbeddingsThrottleService,
  type PriorityQueue,
} from './embeddings-throttle.service';
import { EmbeddingPriority } from '../../domain/embedding-priority.enum';

/**
 * Records the priority each task was enqueued with and runs it immediately.
 * Lets us assert the throttle's mapping/contract without loading the ESM-only
 * p-queue (which the repo's CommonJS jest config cannot import). Real
 * priority-ordering fairness is p-queue's responsibility, exercised end-to-end
 * on the dev stack.
 */
class FakeQueue implements PriorityQueue {
  public readonly priorities: number[] = [];
  async add<T>(
    fn: () => Promise<T>,
    options: { priority: number },
  ): Promise<T | void> {
    this.priorities.push(options.priority);
    return fn();
  }
}

/** Exposes the queue seam so tests inject the fake instead of real p-queue. */
class TestableThrottle extends EmbeddingsThrottleService {
  public readonly queue = new FakeQueue();
  public createQueueCalls = 0;
  protected createQueue(): Promise<PriorityQueue> {
    this.createQueueCalls++;
    return Promise.resolve(this.queue);
  }
}

describe('EmbeddingsThrottleService', () => {
  let service: TestableThrottle;
  const configService = {
    get: jest.fn().mockReturnValue(16),
  } as unknown as ConfigService;

  beforeEach(() => {
    service = new TestableThrottle(configService);
  });

  it('runs the task and returns its result', async () => {
    const result = await service.run(EmbeddingPriority.INGESTION, () =>
      Promise.resolve('embedding'),
    );
    expect(result).toBe('embedding');
  });

  it('propagates task rejections to the caller (never swallows)', async () => {
    await expect(
      service.run(EmbeddingPriority.RETRIEVAL, () =>
        Promise.reject(new Error('boom')),
      ),
    ).rejects.toThrow('boom');
  });

  it('enqueues retrieval at a strictly higher priority than ingestion', async () => {
    await service.run(EmbeddingPriority.INGESTION, () => Promise.resolve(0));
    await service.run(EmbeddingPriority.RETRIEVAL, () => Promise.resolve(0));

    const [ingestionPriority, retrievalPriority] = service.queue.priorities;
    expect(retrievalPriority).toBeGreaterThan(ingestionPriority);
  });

  it('creates the shared queue lazily and reuses it across calls', async () => {
    expect(service.createQueueCalls).toBe(0);
    await service.run(EmbeddingPriority.INGESTION, () => Promise.resolve(0));
    await service.run(EmbeddingPriority.RETRIEVAL, () => Promise.resolve(0));
    expect(service.createQueueCalls).toBe(1);
  });
});

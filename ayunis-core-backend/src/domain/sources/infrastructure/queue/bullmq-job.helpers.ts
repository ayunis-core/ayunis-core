import type { Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import type { UUID } from 'crypto';

/**
 * Standard retry/retention options shared by the source processing queues:
 * 3 attempts with exponential backoff, bounded completed/failed retention.
 */
export const STANDARD_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

/**
 * Best-effort cancellation of a queued job keyed by its source id. Active jobs
 * cannot be removed — the consumer's PROCESSING guard handles those instead.
 */
export async function cancelQueueJob(
  queue: Queue,
  sourceId: UUID,
  logger: Logger,
): Promise<void> {
  try {
    const job = await queue.getJob(sourceId);
    if (!job) {
      logger.debug('No job found to cancel', { sourceId });
      return;
    }

    const state = await job.getState();
    if (state === 'active') {
      logger.debug('Job is active, skipping removal', { sourceId });
      return;
    }

    await job.remove();
    logger.log('Cancelled queued job', { sourceId, state });
  } catch (err) {
    logger.warn('Best-effort job cancellation failed', {
      sourceId,
      error: err as Error,
    });
  }
}

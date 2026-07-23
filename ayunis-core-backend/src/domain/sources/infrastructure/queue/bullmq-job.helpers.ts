import type { Logger } from '@nestjs/common';
import type { Job, JobsOptions, Queue } from 'bullmq';
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
 * True when no BullMQ retry will follow this attempt. When opts.attempts is
 * unset, BullMQ runs the job exactly once, so the first attempt is final.
 */
export function isFinalAttempt(job: Job): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

/**
 * Failure of a job attempt that BullMQ will retry. The AppSignal agent is
 * configured to drop errors with this name (`ignoreErrors` in appsignal.cjs)
 * so only final failures — thrown with their original name — become
 * incidents. Message and stack are preserved so job.failedReason and logs
 * stay as informative as the original error.
 */
export class JobRetryScheduledError extends Error {
  constructor(original: unknown) {
    const message =
      original instanceof Error ? original.message : String(original);
    super(message, { cause: original });
    this.name = 'JobRetryScheduledError';
    if (original instanceof Error && original.stack) {
      this.stack = original.stack;
    }
  }
}

/**
 * BullMQ's UnrecoverableError aborts remaining retries by error name, so it
 * must never be renamed — and its failure is final regardless of attempts.
 */
export function wrapIfRetryScheduled(job: Job, error: unknown): unknown {
  const isUnrecoverable =
    error instanceof Error && error.name === 'UnrecoverableError';
  if (isFinalAttempt(job) || isUnrecoverable) {
    return error;
  }
  return new JobRetryScheduledError(error);
}

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

import type { Logger } from '@nestjs/common';
import type { Job, JobsOptions, Queue } from 'bullmq';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';

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
 * configured to drop errors with this name (the `bullmq-retry-scheduled`
 * suppression in appsignal-hooks.cjs) so only unexpected final failures —
 * thrown with their original name — become incidents. Message and stack are
 * preserved so job.failedReason and logs stay as informative as the original
 * error.
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
 * Statuses where the same request may well succeed later: a timeout or a rate
 * limit says nothing about whether the resource is fetchable. Every other
 * expected status (404, 413, 415, 422, …) describes the input itself, so
 * retrying only repeats the same failure against the same host.
 */
const RETRYABLE_EXPECTED_STATUSES = new Set([408, 429]);

/**
 * A failure caused by the job's own input rather than by a defect of ours —
 * the queue-side counterpart of ApplicationErrorFilter's `statusCode < 500`
 * rule for HTTP. A user pasting a URL to a dead intranet host is not an
 * incident.
 */
export function isExpectedFailure(error: unknown): boolean {
  return error instanceof ApplicationError && error.statusCode < 500;
}

export interface JobFailureOutcome {
  /** No further attempt will run, so the source must be settled as FAILED. */
  final: boolean;
  /**
   * What to rethrow, or null to let the job complete. Returning null is what
   * keeps an expected failure out of AppSignal: a job that completes opens no
   * incident, while the source still shows FAILED with its message.
   */
  rethrow: Error | null;
}

/**
 * Decides how a consumer should end a failed attempt. Expected failures never
 * reach AppSignal — permanent ones settle immediately instead of burning two
 * more attempts, while retryable ones (timeouts, rate limits) keep their
 * retries under the ignored name and still settle quietly if those run out.
 */
export function classifyJobFailure(
  job: Job,
  error: unknown,
): JobFailureOutcome {
  const expected = isExpectedFailure(error);
  const retryIsPointless =
    expected &&
    !RETRYABLE_EXPECTED_STATUSES.has((error as ApplicationError).statusCode);
  const isUnrecoverable =
    error instanceof Error && error.name === 'UnrecoverableError';

  if (!isFinalAttempt(job) && !isUnrecoverable && !retryIsPointless) {
    return { final: false, rethrow: new JobRetryScheduledError(error) };
  }
  if (expected) {
    return { final: true, rethrow: null };
  }
  // AppSignal needs an Error to report; a bare throwable would be dropped.
  return {
    final: true,
    rethrow: error instanceof Error ? error : new Error(String(error)),
  };
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

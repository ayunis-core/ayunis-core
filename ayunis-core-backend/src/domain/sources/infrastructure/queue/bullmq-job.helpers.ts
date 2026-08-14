import type { PinoLogger } from 'nestjs-pino';
import type { Job, JobsOptions, Queue } from 'bullmq';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import { reportProviderUnavailableMetric } from 'src/common/errors/report-provider-unavailable-metric.helper';

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

/**
 * Rejection statuses where a spaced job retry may still succeed: rate limits
 * (429) and request timeouts (408) say nothing about the input, and a 404
 * from the OCR flow is files-API eventual consistency — the handler itself
 * treats it as transient (isTransientOcrError), so the queue must not call
 * it deterministic.
 */
const RETRYABLE_REJECTION_STATUSES = new Set([404, 408, 429]);

/**
 * A provider 4xx rejection is normally deterministic — re-sending the same
 * input yields the same rejection — so retrying only repeats the upstream
 * call; it still rethrows on settling, so its PROVIDER_UNAVAILABLE_REJECTED_*
 * incident opens once instead of after two wasted attempts (AYC-655).
 */
function isDeterministicProviderRejection(error: unknown): boolean {
  return (
    error instanceof ProviderRequestRejectedError &&
    (error.context.upstreamStatus === undefined ||
      !RETRYABLE_REJECTION_STATUSES.has(error.context.upstreamStatus))
  );
}

/**
 * BullMQ keeps scheduling attempts for any thrown error except one named
 * UnrecoverableError (bullmq checks the name, job.ts). A failure settled
 * before the last attempt must rethrow under that name or the remaining
 * attempts run against a source the consumer already failed and cleaned up.
 * The AppSignal grouping survives on `code`, which the queue reporting path
 * prefers over the name.
 */
class JobUnrecoverableError extends Error {
  readonly code?: string;

  constructor(original: Error) {
    super(original.message, { cause: original });
    this.name = 'UnrecoverableError';
    const code = (original as { code?: unknown }).code;
    if (typeof code === 'string') {
      this.code = code;
    }
    if (original.stack) {
      this.stack = original.stack;
    }
  }
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

  if (shouldScheduleRetry(job, error, expected)) {
    return { final: false, rethrow: new JobRetryScheduledError(error) };
  }
  if (expected) {
    return { final: true, rethrow: null };
  }
  // AppSignal needs an Error to report; a bare throwable would be dropped.
  const rethrow = error instanceof Error ? error : new Error(String(error));
  reportProviderUnavailableMetric(rethrow);
  // Settling before the last attempt only sticks when BullMQ also stops
  // scheduling — rename so the remaining attempts never run.
  if (!isFinalAttempt(job) && rethrow.name !== 'UnrecoverableError') {
    return { final: true, rethrow: new JobUnrecoverableError(rethrow) };
  }
  return { final: true, rethrow };
}

function shouldScheduleRetry(
  job: Job,
  error: unknown,
  expected: boolean,
): boolean {
  if (isFinalAttempt(job)) return false;
  if (error instanceof Error && error.name === 'UnrecoverableError') {
    return false;
  }
  const retryIsPointless =
    expected &&
    !RETRYABLE_EXPECTED_STATUSES.has((error as ApplicationError).statusCode);
  return !retryIsPointless && !isDeterministicProviderRejection(error);
}

/**
 * Best-effort cancellation of a queued job keyed by its source id. Active jobs
 * cannot be removed — the consumer's PROCESSING guard handles those instead.
 */
export async function cancelQueueJob(
  queue: Queue,
  sourceId: UUID,
  logger: PinoLogger,
): Promise<void> {
  try {
    const job = await queue.getJob(sourceId);
    if (!job) {
      logger.debug({ sourceId }, 'No job found to cancel');
      return;
    }

    const state = await job.getState();
    if (state === 'active') {
      logger.debug({ sourceId }, 'Job is active, skipping removal');
      return;
    }

    await job.remove();
    logger.info({ sourceId, state }, 'Cancelled queued job');
  } catch (err) {
    logger.warn(
      {
        sourceId,
        err: err as Error,
      },
      'Best-effort job cancellation failed',
    );
  }
}

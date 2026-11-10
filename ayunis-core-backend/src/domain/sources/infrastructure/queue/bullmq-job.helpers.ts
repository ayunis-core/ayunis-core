import type { Logger } from '@nestjs/common';
import type { Job, JobsOptions, Queue } from 'bullmq';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import { reportProviderUnavailableMetric } from 'src/common/errors/report-provider-unavailable-metric.helper';
import {
  DocumentConversionTimeoutError,
  DocumentConverterBusyError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { isFinalAttempt, recordJobFailure } from './job-telemetry';

/**
 * Standard retry/retention options shared by the source processing queues:
 * 3 attempts with exponential backoff, bounded completed/failed retention.
 * Failed jobs also expire after 7 days; a count cap alone keeps rare
 * failures in Bull Board indefinitely.
 */
const STANDARD_RETRY_DELAY_MS = 5000;

export const STANDARD_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: STANDARD_RETRY_DELAY_MS,
  },
  removeOnComplete: 100,
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
};

const CONVERTER_BUSY_RETRY_DELAY_MS = 60_000;
const CONVERSION_TIMEOUT_RETRY_DELAY_MS = 30_000;

/**
 * BullMQ consults a worker's backoffStrategy only for a backoff type that is
 * not built in, so document jobs carry their own type and
 * {@link documentRetryDelayMs} reproduces the standard spacing for them.
 */
export const DOCUMENT_JOB_OPTIONS: JobsOptions = {
  ...STANDARD_JOB_OPTIONS,
  backoff: { type: 'document-processing' },
};

/**
 * Every converter replica was occupied, which lasts as long as the documents
 * ahead take: up to the converter's time limit each. The standard 5 s and
 * 10 s would spend both retries inside that same busy period (AYC-1741).
 */
export function documentRetryDelayMs(
  attemptsMade: number,
  error?: Error,
): number {
  const cause = error instanceof JobRetryScheduledError ? error.cause : error;
  if (cause instanceof DocumentConversionTimeoutError) {
    return CONVERSION_TIMEOUT_RETRY_DELAY_MS;
  }
  const firstDelayMs =
    cause instanceof DocumentConverterBusyError
      ? CONVERTER_BUSY_RETRY_DELAY_MS
      : STANDARD_RETRY_DELAY_MS;
  return firstDelayMs * 2 ** (attemptsMade - 1);
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

/**
 * A conversion can also run out of time because the converter was loaded or
 * slow to start, which the queue cannot see, so one timeout is not yet held
 * against the document. BullMQ carries the previous attempt's message in
 * failedReason; a second timeout in a row settles the document (AYC-1741).
 */
function isFirstConversionTimeout(job: Job, error: unknown): boolean {
  return (
    error instanceof DocumentConversionTimeoutError &&
    job.failedReason !== error.message
  );
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
    recordJobFailure(job, false);
    return { final: false, rethrow: new JobRetryScheduledError(error) };
  }
  recordJobFailure(job, true);
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
    !RETRYABLE_EXPECTED_STATUSES.has((error as ApplicationError).statusCode) &&
    !isFirstConversionTimeout(job, error);
  return !retryIsPointless && !isDeterministicProviderRejection(error);
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
      logger.debug({ sourceId }, 'No job found to cancel');
      return;
    }

    const state = await job.getState();
    if (state === 'active') {
      logger.debug({ sourceId }, 'Job is active, skipping removal');
      return;
    }

    await job.remove();
    logger.log({ sourceId, state }, 'Cancelled queued job');
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

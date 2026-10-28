import { Appsignal, setTag } from '@appsignal/nodejs';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Job } from 'bullmq';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const classifiedJobs = new WeakSet<Job>();

function safely(report: () => void): void {
  try {
    report();
  } catch {
    // Observability must not replace a job result or its original failure.
  }
}

export async function observeJob<T>(
  job: Job,
  run: () => Promise<T>,
): Promise<T> {
  classifiedJobs.delete(job);
  const started = performance.now();
  const wait =
    Math.max(0, (job.processedOn ?? Date.now()) - job.timestamp) / 1000;
  const tags = { queue: job.queueName };
  safely(() => {
    setTag('queue', job.queueName);
    setTag('attempt', job.attemptsMade + 1);
    setTag('queue_wait_seconds', wait);
    tagIdentifiers(job);
    Appsignal.client
      .metrics()
      .addDistributionValue('bullmq_queue_wait_seconds', wait, tags);
  });
  try {
    return await run();
  } catch (error) {
    recordUnclassifiedFailure(job, error);
    throw error;
  } finally {
    classifiedJobs.delete(job);
    const duration = (performance.now() - started) / 1000;
    safely(() => {
      setTag('processing_seconds', duration);
      Appsignal.client
        .metrics()
        .addDistributionValue('bullmq_processing_seconds', duration, tags);
    });
  }
}

function recordUnclassifiedFailure(job: Job, error: unknown): void {
  if (classifiedJobs.has(job)) return;
  const unrecoverable =
    error instanceof Error && error.name === 'UnrecoverableError';
  recordJobFailure(job, unrecoverable || isFinalAttempt(job));
}

/**
 * True when no BullMQ retry will follow this attempt. When opts.attempts is
 * unset, BullMQ runs the job exactly once, so the first attempt is final.
 */
export function isFinalAttempt(job: Job): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

function tagIdentifiers(job: Job): void {
  if (job.id && UUID_PATTERN.test(job.id)) setTag('job_id', job.id);
  const data = job.data as Record<string, unknown>;
  for (const key of ['sourceId', 'uploadId']) {
    const value = data[key];
    if (typeof value === 'string' && UUID_PATTERN.test(value))
      setTag(key, value);
  }
}

export function recordJobFailure(job: Job, final: boolean): void {
  classifiedJobs.add(job);
  safely(() => {
    Appsignal.client
      .metrics()
      .incrementCounter(
        final ? 'bullmq_terminal_failure_count' : 'bullmq_retry_count',
        1,
        { queue: job.queueName },
      );
  });
}

export function processingStage<T>(name: string, run: () => T): T {
  return trace
    .getTracer('ayunis.source-processing')
    .startActiveSpan(name, (span) => {
      try {
        const result = run();
        if (result instanceof Promise) {
          return result
            .catch((error: unknown) => {
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw error;
            })
            .finally(() => span.end()) as T;
        }
        span.end();
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        throw error;
      }
    });
}

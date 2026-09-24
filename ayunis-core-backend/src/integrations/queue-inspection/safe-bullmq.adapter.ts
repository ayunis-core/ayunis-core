import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import type {
  JobStatus,
  QueueAdapterOptions,
} from '@bull-board/api/typings/app';
import type { Job, Queue } from 'bullmq';

interface QueueJobIdentifiers {
  sourceId?: string;
  uploadId?: string;
  targets?: unknown;
}

const REDACTED_VALUE = Object.freeze({ redacted: true });
const REDACTED_TEXT = '[REDACTED]';
const ALLOWED_IDENTIFIER_KEYS = new Set(['sourceId', 'uploadId']);

export function sanitizeQueueJobData(data: unknown): Record<string, unknown> {
  if (!isRecord(data)) {
    return REDACTED_VALUE;
  }

  const identifiers = data as QueueJobIdentifiers;
  if (typeof identifiers.sourceId === 'string') {
    return { sourceId: identifiers.sourceId };
  }

  if (typeof identifiers.uploadId === 'string') {
    return {
      uploadId: identifiers.uploadId,
      sourceIds: extractSourceIds(identifiers.targets),
    };
  }

  return REDACTED_VALUE;
}

export class SafeBullMQAdapter extends BullMQAdapter {
  constructor(queue: Queue, options: Partial<QueueAdapterOptions> = {}) {
    super(queue, {
      ...options,
      readOnlyMode: true,
      allowRetries: false,
    });
    this.setFormatter('data', sanitizeQueueJobData);
    this.setFormatter('returnValue', () => REDACTED_VALUE);
  }

  override async getJob(id: string): Promise<Job | undefined> {
    const job = await super.getJob(id);
    return job ? sanitizeJob(job) : undefined;
  }

  override async getJobs(
    jobStatuses: JobStatus[],
    start?: number,
    end?: number,
  ): Promise<Job[]> {
    const jobs = await super.getJobs(jobStatuses, start, end);
    return jobs.map(sanitizeJob);
  }

  override async getJobLogs(id: string): Promise<string[]> {
    const [logs, job] = await Promise.all([
      super.getJobLogs(id),
      super.getJob(id),
    ]);
    return logs.map((log) => sanitizeFailureText(log, job?.data));
  }
}

export function sanitizeFailureText(text: string, data: unknown): string {
  const sensitiveValues = collectSensitiveStrings(data);
  return sensitiveValues.reduce(
    (sanitized, value) => sanitized.replaceAll(value, REDACTED_TEXT),
    text,
  );
}

function sanitizeJob(job: Job): Job {
  return new Proxy(job, {
    get(target, property, receiver) {
      if (property !== 'toJSON') {
        const value: unknown = Reflect.get(target, property, receiver);
        return value;
      }

      return () => sanitizeJobJson(target.toJSON());
    },
  });
}

function sanitizeJobJson(job: ReturnType<Job['toJSON']>) {
  return {
    ...job,
    failedReason:
      typeof job.failedReason === 'string'
        ? sanitizeFailureText(job.failedReason, job.data)
        : job.failedReason,
    stacktrace: job.stacktrace?.map((line) =>
      sanitizeFailureText(line, job.data),
    ),
  };
}

function collectSensitiveStrings(data: unknown): string[] {
  const values = new Set<string>();
  collectStrings(data, undefined, values, new Set<object>());
  return [...values].sort((left, right) => right.length - left.length);
}

function collectStrings(
  value: unknown,
  key: string | undefined,
  values: Set<string>,
  seen: Set<object>,
): void {
  if (typeof value === 'string') {
    if (!ALLOWED_IDENTIFIER_KEYS.has(key ?? '') && value.length > 0) {
      values.add(value);
    }
    return;
  }

  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);

  const entries = Array.isArray(value)
    ? value.map((item) => [undefined, item] as const)
    : Object.entries(value);
  for (const [nestedKey, nestedValue] of entries) {
    collectStrings(nestedValue, nestedKey, values, seen);
  }
}

function extractSourceIds(targets: unknown): string[] {
  if (!Array.isArray(targets)) {
    return [];
  }

  return targets.flatMap((target) =>
    isRecord(target) && typeof target.sourceId === 'string'
      ? [target.sourceId]
      : [],
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

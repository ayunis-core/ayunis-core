import { Injectable } from '@nestjs/common';
import {
  DocumentExtractionPort,
  type ExtractionJobFailure,
  type ExtractionJobOwner,
  type ExtractionJobProgress,
  type ExtractionJobStatus,
  type ExtractionResultRef,
  type ReleaseExtractionJobsInput,
  type ReleaseExtractionJobsOutcome,
  type StartExtractionJobInput,
  TERMINAL_EXTRACTION_STATES,
} from 'src/domain/sources/application/ports/document-extraction.port';
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';

interface InMemoryExtractionJob extends ExtractionJobStatus {
  owner: ExtractionJobOwner;
  input: StartExtractionJobInput;
}

function notFound(jobId: string): DocumentExtractionFailedError {
  return new DocumentExtractionFailedError(
    'JOB_NOT_FOUND',
    `Unknown extraction job ${jobId}`,
    false,
  );
}

/**
 * The service's job table in memory, with the state machine of contract §5
 * and §7. Tests drive the service side through `run`, `progress`, `succeed`
 * and `fail`; everything the backend may call goes through the port.
 */
@Injectable()
export class InMemoryDocumentExtractionAdapter extends DocumentExtractionPort {
  private readonly jobs = new Map<string, InMemoryExtractionJob>();
  private readonly jobIdByKey = new Map<string, string>();
  private sequence = 0;
  readonly startCalls: StartExtractionJobInput[] = [];

  start(input: StartExtractionJobInput): Promise<ExtractionJobStatus> {
    this.startCalls.push(input);
    const existing = this.jobByKey(input.idempotencyKey);
    if (existing) {
      this.requeueIfRetryable(existing);
      return Promise.resolve(snapshot(existing));
    }
    const job: InMemoryExtractionJob = {
      jobId: `job-${++this.sequence}`,
      idempotencyKey: input.idempotencyKey,
      state: 'queued',
      phase: null,
      attempt: 1,
      restarts: 0,
      progress: { pagesTotal: null, pagesDone: 0, pagesOcr: 0, pagesText: 0 },
      result: null,
      error: null,
      owner: input.owner,
      input,
    };
    this.jobs.set(job.jobId, job);
    this.jobIdByKey.set(input.idempotencyKey, job.jobId);
    return Promise.resolve(snapshot(job));
  }

  async status(jobId: string): Promise<ExtractionJobStatus> {
    return snapshot(await this.lookup(jobId));
  }

  async result(jobId: string): Promise<ExtractionResultRef> {
    const job = await this.lookup(jobId);
    if (job.state !== 'succeeded' || !job.result) {
      throw new DocumentExtractionFailedError(
        'JOB_NOT_FINISHED',
        `Job ${jobId} is ${job.state}`,
        false,
      );
    }
    return { ...job.result };
  }

  async cancel(jobId: string): Promise<ExtractionJobStatus> {
    const job = await this.lookup(jobId);
    if (!TERMINAL_EXTRACTION_STATES.has(job.state)) {
      job.state = 'cancelled';
      job.phase = null;
      job.result = null;
    }
    return snapshot(job);
  }

  release(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.delete(jobId);
      this.jobIdByKey.delete(job.idempotencyKey);
    }
    return Promise.resolve();
  }

  async releaseOwner(
    input: ReleaseExtractionJobsInput,
  ): Promise<ReleaseExtractionJobsOutcome> {
    const outcome = { released: 0, cancelled: 0 };
    for (const job of [...this.jobs.values()]) {
      if (!this.isOwnedBy(job, input)) continue;
      if (!TERMINAL_EXTRACTION_STATES.has(job.state)) outcome.cancelled += 1;
      await this.release(job.jobId);
      outcome.released += 1;
    }
    return outcome;
  }

  /* Service side, for tests. */

  run(jobId: string, phase = 'extracting'): void {
    const job = this.require(jobId);
    if (TERMINAL_EXTRACTION_STATES.has(job.state)) return;
    job.state = 'running';
    job.phase = phase;
  }

  progress(jobId: string, progress: Partial<ExtractionJobProgress>): void {
    const job = this.require(jobId);
    job.progress = { ...job.progress, ...progress };
  }

  /** No-op once cancelled: a cancelled job never gains a result (contract §7.1). */
  succeed(jobId: string, result: ExtractionResultRef): void {
    const job = this.require(jobId);
    if (job.state === 'cancelled') return;
    job.state = 'succeeded';
    job.phase = null;
    job.result = result;
    job.progress = {
      ...job.progress,
      pagesTotal: result.pageCount,
      pagesDone: result.pageCount,
    };
  }

  fail(jobId: string, error: ExtractionJobFailure): void {
    const job = this.require(jobId);
    if (job.state === 'cancelled') return;
    job.state = 'failed';
    job.phase = null;
    job.error = error;
  }

  findByKey(idempotencyKey: string): ExtractionJobStatus | undefined {
    const job = this.jobByKey(idempotencyKey);
    return job && snapshot(job);
  }

  get jobCount(): number {
    return this.jobs.size;
  }

  private requeueIfRetryable(job: InMemoryExtractionJob): void {
    if (job.state !== 'failed' || !job.error?.retryable) return;
    job.state = 'queued';
    job.attempt += 1;
    job.error = null;
  }

  private isOwnedBy(
    job: InMemoryExtractionJob,
    input: ReleaseExtractionJobsInput,
  ): boolean {
    return (
      job.owner.orgId === input.orgId &&
      (input.sourceIds === undefined ||
        input.sourceIds.includes(job.owner.sourceId))
    );
  }

  private jobByKey(idempotencyKey: string): InMemoryExtractionJob | undefined {
    const jobId = this.jobIdByKey.get(idempotencyKey);
    return jobId ? this.jobs.get(jobId) : undefined;
  }

  private lookup(jobId: string): Promise<InMemoryExtractionJob> {
    const job = this.jobs.get(jobId);
    return job ? Promise.resolve(job) : Promise.reject(notFound(jobId));
  }

  private require(jobId: string): InMemoryExtractionJob {
    const job = this.jobs.get(jobId);
    if (!job) throw notFound(jobId);
    return job;
  }
}

function snapshot(job: InMemoryExtractionJob): ExtractionJobStatus {
  return {
    jobId: job.jobId,
    idempotencyKey: job.idempotencyKey,
    state: job.state,
    phase: job.phase,
    attempt: job.attempt,
    restarts: job.restarts,
    progress: { ...job.progress },
    result: job.result && { ...job.result },
    error: job.error && { ...job.error },
  };
}

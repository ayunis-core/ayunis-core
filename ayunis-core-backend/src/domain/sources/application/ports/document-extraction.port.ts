import type { UUID } from 'crypto';

/**
 * Contract with the extraction service: docs/design/document-extraction-contract.md §3.
 * Objects travel by reference; the service reads `input` and writes under
 * `outputKeyPrefix` in the backend's bucket.
 */
export type ExtractionJobState =
  'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export const TERMINAL_EXTRACTION_STATES: ReadonlySet<ExtractionJobState> =
  new Set(['succeeded', 'failed', 'cancelled']);

export interface ExtractionObjectRef {
  key: string;
  sha256: string;
}

export interface ExtractionJobOwner {
  orgId: UUID;
  sourceId: UUID;
}

export interface ExtractionJobOptions {
  maxPages?: number;
  ocr?: 'auto' | 'always' | 'never';
  languageHints?: string[];
}

export interface StartExtractionJobInput {
  /** `v1:<sourceId>:<sha256>`; see buildExtractionIdempotencyKey. */
  idempotencyKey: string;
  owner: ExtractionJobOwner;
  input: ExtractionObjectRef;
  fileName: string;
  declaredMimeType: string;
  /** Under the source's processing prefix so one purge removes results too. */
  outputKeyPrefix: string;
  options?: ExtractionJobOptions;
}

export interface ExtractionJobProgress {
  /** Null until the service has counted the pages. */
  pagesTotal: number | null;
  pagesDone: number;
  pagesOcr: number;
  pagesText: number;
}

export interface ExtractionJobFailure {
  /** Service code, contract §10.1. */
  code: string;
  /** Safe to persist as the source's processingError. */
  message: string;
  retryable: boolean;
  /** Provider status codes and the like; for logs only. */
  details?: Record<string, unknown>;
}

export interface ExtractionResultRef {
  bucket: string;
  key: string;
  bytes: number;
  sha256: string;
  pageCount: number;
}

export interface ExtractionJobStatus {
  jobId: string;
  idempotencyKey: string;
  state: ExtractionJobState;
  phase: string | null;
  attempt: number;
  restarts: number;
  progress: ExtractionJobProgress;
  result: ExtractionResultRef | null;
  error: ExtractionJobFailure | null;
}

export interface ReleaseExtractionJobsInput {
  orgId: UUID;
  /** Omitted releases every job of the organisation. */
  sourceIds?: UUID[];
}

export interface ReleaseExtractionJobsOutcome {
  released: number;
  cancelled: number;
}

export abstract class DocumentExtractionPort {
  /**
   * Idempotent per key: an existing job is returned instead of started, and a
   * retryable failure is re-queued in place. This is also how a BullMQ retry
   * reconnects to the running job.
   */
  abstract start(input: StartExtractionJobInput): Promise<ExtractionJobStatus>;
  abstract status(jobId: string): Promise<ExtractionJobStatus>;
  /** Only valid once the job has succeeded. */
  abstract result(jobId: string): Promise<ExtractionResultRef>;
  /** Idempotent; a terminal job is returned unchanged. */
  abstract cancel(jobId: string): Promise<ExtractionJobStatus>;
  /** Cancels if needed, deletes what the service wrote, forgets the job. */
  abstract release(jobId: string): Promise<void>;
  abstract releaseOwner(
    input: ReleaseExtractionJobsInput,
  ): Promise<ReleaseExtractionJobsOutcome>;
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Job } from 'bullmq';
import { createHash } from 'crypto';
import { setTimeout as sleep } from 'timers/promises';
import {
  type ExtractionConfig,
  extractionConfig,
} from 'src/config/extraction.config';
import retrievalConfig from 'src/config/retrieval.config';
import type { ExtractionResult } from 'src/domain/sources/application/models/extraction-result';
import {
  DocumentExtractionPort,
  type ExtractionJobStatus,
  type ExtractionResultRef,
  TERMINAL_EXTRACTION_STATES,
} from 'src/domain/sources/application/ports/document-extraction.port';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';
import { mapExtractionFailure } from 'src/domain/sources/application/util/extraction-failure.helper';
import {
  buildExtractionIdempotencyKey,
  buildExtractionOutputPrefix,
} from 'src/domain/sources/application/util/extraction-job.helper';
import { parseExtractionResult } from 'src/domain/sources/application/util/extraction-result.helper';
import { downloadMinioFile } from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';

export type ExtractionRunOutcome =
  | { kind: 'succeeded'; result: ExtractionResultRef }
  /** The service reports the job cancelled; the source row is not ours to touch. */
  | { kind: 'cancelled' }
  /**
   * The backend released the job (source or organisation deletion) while
   * this attempt was polling. Whoever released it owns the cleanup; the
   * attempt must end here, never start the job again under the same key.
   */
  | { kind: 'released' }
  /** The heartbeat found the source gone or no longer processing. */
  | { kind: 'abandoned' };

type PollEnd =
  ExtractionJobStatus | Exclude<ExtractionRunOutcome, { kind: 'succeeded' }>;

const INITIAL_POLL_MS = 1000;

/**
 * One BullMQ attempt's conversation with the extraction service (contract
 * §5): start or reconnect by idempotency key, poll until terminal while the
 * source heartbeat and page progress are refreshed, then fetch the result.
 */
@Injectable()
export class ExtractionJobRunner {
  private readonly logger = new Logger(ExtractionJobRunner.name);

  constructor(
    private readonly extraction: DocumentExtractionPort,
    private readonly sourceRepository: SourceRepository,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    @Inject(extractionConfig.KEY) private readonly config: ExtractionConfig,
    @Inject(retrievalConfig.KEY)
    private readonly retrieval: ConfigType<typeof retrievalConfig>,
  ) {}

  /** Throws the mapped backend error when the service reports the job failed. */
  async run(
    job: Job<DocumentProcessingJobData>,
  ): Promise<ExtractionRunOutcome> {
    const started = await this.startOrReconnect(job);
    const final = await this.pollUntilTerminal(job.data.sourceId, started);
    if ('kind' in final) return final;
    if (final.state === 'cancelled') return { kind: 'cancelled' };
    if (final.state === 'failed') {
      throw mapExtractionFailure(
        final.error ?? {
          code: 'INTERNAL',
          message: 'Extraction failed without an error',
          retryable: false,
        },
        job.data.fileName,
      );
    }
    return {
      kind: 'succeeded',
      result: await this.extraction.result(final.jobId),
    };
  }

  /** The result object is small (text only), so it is the one thing the API still downloads. */
  async fetchResult(ref: ExtractionResultRef): Promise<ExtractionResult> {
    const raw = await downloadMinioFile(
      this.downloadObjectUseCase,
      ref.key,
      ref.bucket,
    );
    return parseExtractionResult(raw);
  }

  /**
   * Best-effort end of a job: the service forgets it and deletes what it
   * wrote, and the whole processing prefix (input, checkpoints, result) goes.
   * Each half runs even when the other fails; an unreachable service must
   * not leave the input object behind.
   */
  async release(data: DocumentProcessingJobData): Promise<void> {
    if (data.extractionJobId) {
      try {
        await this.extraction.release(data.extractionJobId);
      } catch (err) {
        this.logger.warn(
          { sourceId: data.sourceId, err: err as Error },
          'Failed to release extraction job',
        );
      }
    }
    try {
      await this.purgeStoragePrefixesUseCase.execute(
        new PurgeStoragePrefixesCommand([
          `${data.orgId}/processing/${data.sourceId}/`,
        ]),
      );
    } catch (err) {
      this.logger.warn(
        { sourceId: data.sourceId, err: err as Error },
        'Failed to purge the processing prefix',
      );
    }
  }

  private async startOrReconnect(
    job: Job<DocumentProcessingJobData>,
  ): Promise<ExtractionJobStatus> {
    const { data } = job;
    const sha256 = data.sha256 ?? (await this.hashStoredObject(data.minioPath));
    const status = await this.extraction.start({
      idempotencyKey: buildExtractionIdempotencyKey(data.sourceId, sha256),
      owner: { orgId: data.orgId, sourceId: data.sourceId },
      input: { key: data.minioPath, sha256 },
      fileName: data.fileName,
      declaredMimeType: data.fileType,
      outputKeyPrefix: buildExtractionOutputPrefix(data.orgId, data.sourceId),
      options: { maxPages: this.retrieval.processingMaxPdfPages },
    });
    if (status.jobId !== data.extractionJobId || sha256 !== data.sha256) {
      await job.updateData({ ...data, sha256, extractionJobId: status.jobId });
    }
    this.logger.log(
      {
        sourceId: data.sourceId,
        jobId: status.jobId,
        state: status.state,
        serviceAttempt: status.attempt,
        attempt: job.attemptsMade + 1,
      },
      'Extraction job connected',
    );
    return status;
  }

  private async pollUntilTerminal(
    sourceId: DocumentProcessingJobData['sourceId'],
    initial: ExtractionJobStatus,
  ): Promise<PollEnd> {
    let status = initial;
    let delayMs = Math.min(INITIAL_POLL_MS, this.config.pollIntervalMs);
    while (!TERMINAL_EXTRACTION_STATES.has(status.state)) {
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, this.config.pollIntervalMs);
      const next = await this.pollOnce(status.jobId);
      if (!next) {
        this.logger.warn(
          { sourceId, jobId: status.jobId },
          'Extraction job was released while polling',
        );
        return { kind: 'released' };
      }
      status = next;
      const alive = await this.sourceRepository.refreshProcessingHeartbeat(
        sourceId,
        {
          pagesTotal: status.progress.pagesTotal,
          pagesDone: status.progress.pagesDone,
        },
      );
      if (!alive) {
        this.logger.warn(
          { sourceId, jobId: status.jobId },
          'Source gone or no longer processing while extracting',
        );
        return { kind: 'abandoned' };
      }
    }
    return status;
  }

  /**
   * Null when the service no longer knows the job: the backend released it
   * (source or organisation deletion, contract §7.2). Throwing here would
   * retry the attempt and `start` would open a second job under the same
   * key, which is exactly what the key exists to prevent.
   */
  private async pollOnce(jobId: string): Promise<ExtractionJobStatus | null> {
    try {
      return await this.extraction.status(jobId);
    } catch (error) {
      if (
        error instanceof DocumentExtractionFailedError &&
        error.serviceCode === 'JOB_NOT_FOUND'
      ) {
        return null;
      }
      throw error;
    }
  }

  /** Jobs enqueued before the hash was recorded: hash the staged object by streaming it. */
  private async hashStoredObject(minioPath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(minioPath),
    );
    for await (const chunk of stream) hash.update(chunk as Buffer);
    return hash.digest('hex');
  }
}

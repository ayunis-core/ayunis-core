import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type Job } from 'bullmq';
import { SourceProcessingProgressPort } from 'src/domain/sources/application/ports/source-processing-progress.port';
import {
  SourceProcessingStage,
  type SourceProcessingProgress,
} from 'src/domain/sources/application/models/source-processing-progress';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';

type ProgressDetails = Omit<SourceProcessingProgress, 'sourceId'>;
type ProgressUnit = NonNullable<SourceProcessingProgress['unit']>;

const DEFAULT_STAGE = SourceProcessingStage.PREPARING;

const PROCESSING_STAGES = new Set<string>(Object.values(SourceProcessingStage));

@Injectable()
export class SourceProcessingProgressAdapter extends SourceProcessingProgressPort {
  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly documentQueue: Queue,
    @InjectQueue(DATA_SOURCE_PROCESSING_QUEUE)
    private readonly dataSourceQueue: Queue,
    @InjectQueue(URL_CRAWL_QUEUE)
    private readonly crawlQueue: Queue,
  ) {
    super();
  }

  async read(source: Source): Promise<SourceProcessingProgress> {
    const settledStage = getSettledStage(source.status);
    if (settledStage) {
      return { sourceId: source.id, stage: settledStage };
    }

    const job = await this.findJob(source);
    if (!job) {
      return { sourceId: source.id, stage: SourceProcessingStage.QUEUED };
    }

    const state = await job.getState();
    return { sourceId: source.id, ...resolveJobProgress(state, job.progress) };
  }

  private async findJob(source: Source): Promise<Job | undefined> {
    const documentJob = await this.documentQueue.getJob(source.id);
    if (documentJob) {
      return documentJob;
    }

    const uploadId = extractUploadId(source.storageKey);
    if (uploadId) {
      return this.dataSourceQueue.getJob(uploadId);
    }

    return this.crawlQueue.getJob(source.id);
  }
}

// Only the stored status says a file is ready or failed; the queue reports
// how far the work is.
function getSettledStage(
  status: SourceStatus,
): SourceProcessingStage | undefined {
  switch (status) {
    case SourceStatus.READY:
    case SourceStatus.REINDEXING:
      return SourceProcessingStage.READY;
    case SourceStatus.FAILED:
      return SourceProcessingStage.FAILED;
    case SourceStatus.PROCESSING:
      return undefined;
  }
}

function resolveJobProgress(state: string, progress: unknown): ProgressDetails {
  switch (state) {
    case 'delayed':
      return { stage: SourceProcessingStage.RETRYING };
    // The job can finish a moment before the stored status is read as ready.
    case 'completed':
      return { stage: SourceProcessingStage.INDEXING };
    case 'failed':
      return { stage: SourceProcessingStage.FAILED };
    case 'active':
      return parseProgress(progress);
    default:
      return { stage: SourceProcessingStage.QUEUED };
  }
}

function extractUploadId(
  storageKey: string | null | undefined,
): string | undefined {
  return storageKey?.match(/^[^/]+\/uploads\/([^/]+)\//)?.[1];
}

function parseProgress(value: unknown): ProgressDetails {
  if (!isRecord(value)) {
    return { stage: DEFAULT_STAGE };
  }

  const stage = normalizeStage(value.stage);
  const completed = parseCompletedUnits(value.completed);
  const unit = parseProgressUnit(value.unit);

  return {
    stage,
    ...(completed !== undefined && { completed, unit }),
  };
}

function normalizeStage(value: unknown): SourceProcessingStage {
  if (value === 'extraction') {
    return SourceProcessingStage.EXTRACTING;
  }

  if (typeof value === 'string' && PROCESSING_STAGES.has(value)) {
    return value as SourceProcessingStage;
  }

  return DEFAULT_STAGE;
}

function parseCompletedUnits(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function parseProgressUnit(value: unknown): ProgressUnit | undefined {
  return value === 'pages' || value === 'parts' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

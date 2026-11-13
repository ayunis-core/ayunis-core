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

@Injectable()
export class SourceProcessingProgressAdapter extends SourceProcessingProgressPort {
  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly documents: Queue,
    @InjectQueue(DATA_SOURCE_PROCESSING_QUEUE)
    private readonly dataSources: Queue,
    @InjectQueue(URL_CRAWL_QUEUE) private readonly crawls: Queue,
  ) {
    super();
  }

  async read(source: Source): Promise<SourceProcessingProgress> {
    if (source.status === SourceStatus.READY)
      return { sourceId: source.id, stage: SourceProcessingStage.READY };
    if (source.status === SourceStatus.FAILED)
      return { sourceId: source.id, stage: SourceProcessingStage.FAILED };
    const job = await this.findJob(source);
    if (!job)
      return { sourceId: source.id, stage: SourceProcessingStage.QUEUED };
    const state = await job.getState();
    if (state === 'delayed')
      return { sourceId: source.id, stage: SourceProcessingStage.RETRYING };
    if (state === 'completed')
      return { sourceId: source.id, stage: SourceProcessingStage.READY };
    if (state === 'failed')
      return { sourceId: source.id, stage: SourceProcessingStage.FAILED };
    if (state !== 'active')
      return { sourceId: source.id, stage: SourceProcessingStage.QUEUED };
    return { sourceId: source.id, ...parseProgress(job.progress) };
  }

  private async findJob(source: Source): Promise<Job | undefined> {
    const document = await this.documents.getJob(source.id);
    if (document) return document;
    const uploadId = source.storageKey?.match(
      /^[^/]+\/uploads\/([^/]+)\//,
    )?.[1];
    if (uploadId) return this.dataSources.getJob(uploadId);
    return this.crawls.getJob(source.id);
  }
}

function parseProgress(
  value: unknown,
): Omit<SourceProcessingProgress, 'sourceId'> {
  if (typeof value !== 'object' || value === null)
    return { stage: SourceProcessingStage.PREPARING };
  const progress = value as Record<string, unknown>;
  const stage =
    progress.stage === 'extraction'
      ? SourceProcessingStage.EXTRACTING
      : progress.stage;
  const known = Object.values(SourceProcessingStage).find(
    (candidate) => candidate === stage,
  );
  const completed = completedUnits(progress.completed);
  const unit =
    progress.unit === 'pages' || progress.unit === 'parts'
      ? progress.unit
      : undefined;
  return {
    stage: known ?? SourceProcessingStage.PREPARING,
    ...(completed !== undefined ? { completed, unit } : {}),
  };
}

function completedUnits(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

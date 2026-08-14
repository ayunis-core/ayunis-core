import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  ParsedSheet,
  SpreadsheetParserPort,
} from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { DataSourceFileKind } from 'src/domain/sources/domain/data-source-file-kind.type';
import type {
  DataSourceProcessingJobData,
  DataSourceProcessingTarget,
} from '../../application/ports/data-source-processing.port';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { classifyJobFailure } from './bullmq-job.helpers';
import {
  cleanupMinioProcessingFile,
  downloadMinioFile,
} from '../../application/util/minio-processing-file.helpers';

@Processor(DATA_SOURCE_PROCESSING_QUEUE, { concurrency: 2 })
export class DataSourceProcessingConsumer extends WorkerHost {
  constructor(
    @InjectPinoLogger(DataSourceProcessingConsumer.name)
    private readonly logger: PinoLogger,
    private readonly contextService: ContextService,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly spreadsheetParser: SpreadsheetParserPort,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
  ) {
    super();
  }

  async process(job: Job<DataSourceProcessingJobData>): Promise<void> {
    this.logger.info(
      {
        fileName: job.data.fileName,
        jobId: job.id,
        targetCount: job.data.targets.length,
      },
      'Processing data source file',
    );
    await this.contextService.run(() => this.processJob(job));
  }

  private async processJob(
    job: Job<DataSourceProcessingJobData>,
  ): Promise<void> {
    const { orgId, userId, minioPath, fileName, kind, targets } = job.data;
    this.validateAndSetContext(orgId, userId);

    try {
      const pending = await this.loadPendingTargets(targets);
      if (pending.length === 0) {
        this.logger.warn(
          { jobId: job.id },
          'No pending sources left for job, skipping',
        );
        await this.cleanupMinioFile(minioPath);
        return;
      }

      const fileBuffer = await this.downloadFile(minioPath);
      const sheets = await this.parseFile(fileBuffer, kind);
      await this.fillSources(pending, sheets);
      await this.cleanupMinioFile(minioPath);
      this.logger.info(
        { fileName, sources: pending.length },
        'Data source processing complete',
      );
    } catch (error) {
      this.logger.error(
        { err: error as Error, fileName },
        'Data source processing failed',
      );
      const { final, rethrow } = classifyJobFailure(job, error);
      if (final) {
        await this.markPendingTargetsFailed(
          targets,
          error instanceof Error ? error.message : 'Unknown processing error',
        );
        await this.cleanupMinioFile(minioPath);
      }
      if (rethrow) throw rethrow;
    }
  }

  private validateAndSetContext(
    orgId: UUID | undefined,
    userId: UUID | undefined,
  ): void {
    if (!orgId) {
      throw new Error('orgId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    this.contextService.set('orgId', orgId);
    this.contextService.set('userId', userId);
  }

  private async loadPendingTargets(
    targets: DataSourceProcessingTarget[],
  ): Promise<{ source: CSVDataSource; sheetName: string | null }[]> {
    const pending: { source: CSVDataSource; sheetName: string | null }[] = [];
    for (const target of targets) {
      const source = await this.sourceRepository.findById(target.sourceId);
      if (source?.status !== SourceStatus.PROCESSING) {
        this.logger.warn(
          {
            sourceId: target.sourceId,
            found: !!source,
          },
          'Source missing or no longer processing, skipping',
        );
        continue;
      }
      if (!(source instanceof CSVDataSource)) {
        throw new Error(`Source ${target.sourceId} is not a CSVDataSource`);
      }

      // Reset processingStartedAt on every attempt so the stale-cleanup
      // cron doesn't race with BullMQ retries on long-running jobs. Guarded
      // UPDATE, not save(): save() would re-insert a row deleted since the
      // findById above.
      const alive = await this.sourceRepository.refreshProcessingHeartbeat(
        target.sourceId,
      );
      if (!alive) {
        this.logger.warn(
          {
            sourceId: target.sourceId,
          },
          'Source deleted mid-load, skipping',
        );
        continue;
      }
      pending.push({ source, sheetName: target.sheetName });
    }
    return pending;
  }

  private async parseFile(
    fileBuffer: Buffer,
    kind: DataSourceFileKind,
  ): Promise<ParsedSheet[]> {
    if (kind === 'csv') {
      const parsed = await this.spreadsheetParser.parseCsv(
        fileBuffer.toString('utf8'),
      );
      return [{ sheetName: '', headers: parsed.headers, rows: parsed.rows }];
    }
    return this.spreadsheetParser.parseWorkbook(fileBuffer);
  }

  private async fillSources(
    pending: { source: CSVDataSource; sheetName: string | null }[],
    sheets: ParsedSheet[],
  ): Promise<void> {
    for (const { source, sheetName } of pending) {
      const parsed =
        sheetName === null
          ? sheets[0]
          : sheets.find((sheet) => sheet.sheetName === sheetName);

      if (!parsed) {
        // Empty sheets are filtered out before sources are created, but a
        // sheet whose used range holds only blank cells passes that cheap
        // check while the full parse still drops it — fail its source.
        await this.tryMarkSourceFailed(
          source.id,
          `Sheet "${sheetName ?? ''}" contains no data`,
        );
        continue;
      }

      await this.fillSource(source.id, parsed);
    }
  }

  private async fillSource(sourceId: UUID, parsed: ParsedSheet): Promise<void> {
    // Guarded UPDATEs only — a save() here could re-insert a concurrently
    // deleted row (TypeORM save is an upsert), resurrecting sources the user
    // already removed.
    const dataWritten = await this.sourceRepository.updateCsvSourceData(
      sourceId,
      { headers: parsed.headers, rows: parsed.rows },
    );
    if (!dataWritten) {
      this.logger.warn(
        {
          sourceId,
        },
        'Source deleted mid-processing, skipping',
      );
      return;
    }

    const updated = await this.sourceRepository.updateStatusConditionally(
      sourceId,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    if (!updated) {
      this.logger.warn(
        { sourceId },
        'Conditional update to READY failed — source was deleted or status changed',
      );
    }
  }

  private async markPendingTargetsFailed(
    targets: DataSourceProcessingTarget[],
    errorMessage: string,
  ): Promise<void> {
    for (const target of targets) {
      const source = await this.sourceRepository.findById(target.sourceId);
      if (source?.status !== SourceStatus.PROCESSING) {
        continue;
      }
      await this.tryMarkSourceFailed(target.sourceId, errorMessage);
    }
  }

  private async tryMarkSourceFailed(
    sourceId: UUID,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({ sourceId, errorMessage }),
      );
    } catch (err) {
      this.logger.error(
        {
          sourceId,
          err: err as Error,
        },
        'Failed to mark source as FAILED',
      );
    }
  }

  private async downloadFile(minioPath: string): Promise<Buffer> {
    return downloadMinioFile(this.downloadObjectUseCase, minioPath);
  }

  private async cleanupMinioFile(minioPath: string): Promise<void> {
    await cleanupMinioProcessingFile(
      this.deleteObjectUseCase,
      this.logger,
      minioPath,
    );
  }
}

import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { buildMinioProcessingPath } from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SpreadsheetParserPort } from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import type { DataSourceProcessingTarget } from 'src/domain/sources/application/ports/data-source-processing.port';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { EnqueueDataSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-data-source-processing/enqueue-data-source-processing.use-case';
import { EnqueueDataSourceProcessingCommand } from 'src/domain/sources/application/use-cases/enqueue-data-source-processing/enqueue-data-source-processing.command';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import {
  EmptyFileDataError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { StartDataSourceProcessingCommand } from './start-data-source-processing.command';

interface SourcePlan {
  name: string;
  sheetName: string | null;
}

/**
 * Async ingestion entry point for CSV/spreadsheet uploads, mirroring
 * StartDocumentProcessingUseCase: pre-create one PROCESSING CSVDataSource per
 * data sheet (sheet names come from a cheap first-row-only parse that skips
 * empty sheets), stash the raw file in MinIO, and enqueue a single job that
 * parses once and fills all of them. Returns the PROCESSING sources
 * immediately.
 */
@Injectable()
export class StartDataSourceProcessingUseCase {
  private readonly logger = new Logger(StartDataSourceProcessingUseCase.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly spreadsheetParser: SpreadsheetParserPort,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly enqueueDataSourceProcessingUseCase: EnqueueDataSourceProcessingUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: StartDataSourceProcessingCommand,
  ): Promise<CSVDataSource[]> {
    this.logger.log(
      {
        fileName: command.fileName,
        kind: command.kind,
      },
      'Starting async data source processing',
    );

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new Error('orgId is required');
    }
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new Error('userId is required');
    }

    const plans = await this.resolveSourcePlans(command);
    // Rejecting an over-capacity workbook here costs nothing; after this
    // point sources exist, the file is uploaded, and a job is enqueued.
    command.ensureCapacityFor?.(plans.length);
    const sources = await this.createProcessingSources(plans);

    // The job and its file are shared by every sheet source, so they are
    // keyed by a fresh upload id rather than any (deletable) source id.
    const uploadId = randomUUID();
    // Upload and enqueue both happen outside the transaction
    const minioPath = buildMinioProcessingPath(
      orgId,
      uploadId,
      command.fileName,
    );
    await this.uploadFileOrFail(sources, minioPath, command);
    await this.enqueueOrFail(
      { sources, plans, uploadId, minioPath, orgId, userId },
      command,
    );

    return sources;
  }

  private async resolveSourcePlans(
    command: StartDataSourceProcessingCommand,
  ): Promise<SourcePlan[]> {
    if (command.kind === 'csv') {
      return [{ name: command.fileName, sheetName: null }];
    }

    const sheetNames = await this.spreadsheetParser.listDataSheets(
      command.fileData,
    );
    if (sheetNames.length === 0) {
      throw new EmptyFileDataError(command.fileName);
    }

    const baseFileName = command.fileName.replace(/\.(xlsx|xls)$/i, '');
    return sheetNames.map((sheetName) => ({
      sheetName,
      name:
        sheetNames.length === 1
          ? `${baseFileName}.csv`
          : `${baseFileName}_${sheetName.replace(/\s+/g, '_')}.csv`,
    }));
  }

  @Transactional()
  private async createProcessingSources(
    plans: SourcePlan[],
  ): Promise<CSVDataSource[]> {
    const sources: CSVDataSource[] = [];
    for (const plan of plans) {
      const source = new CSVDataSource({
        name: plan.name,
        data: { headers: [], rows: [] },
        status: SourceStatus.PROCESSING,
        processingStartedAt: new Date(),
      });
      sources.push((await this.sourceRepository.save(source)) as CSVDataSource);
    }
    return sources;
  }

  private async uploadFileOrFail(
    sources: CSVDataSource[],
    minioPath: string,
    command: StartDataSourceProcessingCommand,
  ): Promise<void> {
    try {
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(minioPath, command.fileData),
      );
    } catch (error) {
      await this.tryMarkSourcesFailed(
        sources,
        'Failed to upload file to storage',
      );
      throw error;
    }
  }

  private async enqueueOrFail(
    batch: {
      sources: CSVDataSource[];
      plans: SourcePlan[];
      uploadId: UUID;
      minioPath: string;
      orgId: UUID;
      userId: UUID;
    },
    command: StartDataSourceProcessingCommand,
  ): Promise<void> {
    const targets: DataSourceProcessingTarget[] = batch.sources.map(
      (source, index) => ({
        sourceId: source.id,
        sheetName: batch.plans[index].sheetName,
      }),
    );

    try {
      await this.enqueueDataSourceProcessingUseCase.execute(
        new EnqueueDataSourceProcessingCommand({
          uploadId: batch.uploadId,
          orgId: batch.orgId,
          userId: batch.userId,
          minioPath: batch.minioPath,
          fileName: command.fileName,
          kind: command.kind,
          targets,
        }),
      );
    } catch (error) {
      this.logger.error(
        {
          sourceIds: batch.sources.map((source) => source.id),
          err: error as Error,
        },
        'Failed to enqueue data source processing job',
      );
      await this.tryMarkSourcesFailed(
        batch.sources,
        'Failed to enqueue processing job',
      );
      await this.cleanupMinioFile(batch.minioPath);
      throw error;
    }
  }

  private async cleanupMinioFile(minioPath: string): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(minioPath),
      );
    } catch (err) {
      this.logger.warn(
        {
          fileName: minioPath,
          err: err as Error,
        },
        'Failed to clean up MinIO processing file',
      );
    }
  }

  private async tryMarkSourcesFailed(
    sources: CSVDataSource[],
    errorMessage: string,
  ): Promise<void> {
    for (const source of sources) {
      try {
        await this.markSourceFailedUseCase.execute(
          new MarkSourceFailedCommand({
            sourceId: source.id,
            errorMessage,
          }),
        );
      } catch (err) {
        this.logger.error(
          {
            sourceId: source.id,
            err: err as Error,
          },
          'Failed to mark source as FAILED',
        );
      }
    }
  }
}

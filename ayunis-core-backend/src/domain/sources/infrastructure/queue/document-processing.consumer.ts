import {
  ProcessingStoppedError,
  type ProcessingContext,
} from 'src/common/types/processing-context';
import { ProcessingCheckpointService } from 'src/domain/sources/application/services/processing-checkpoint.service';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { PreflightCheckCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { StoredSourceFileService } from 'src/domain/sources/application/services/stored-source-file.service';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { AdmitOrgProcessingUseCase } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.use-case';
import { AdmitOrgProcessingQuery } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.query';
import { SpreadsheetParserPort } from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import { tableToText } from 'src/domain/sources/application/util/table-to-text';
import {
  detectFileType,
  isCSVFile,
  isSpreadsheetFile,
} from 'src/common/util/file-type';
import { EmptyFileDataError } from 'src/domain/sources/application/sources.errors';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { classifyJobFailure } from './bullmq-job.helpers';
import { SourceProcessingHeartbeatService } from 'src/domain/sources/application/services/source-processing-heartbeat.service';
import { observeJob, processingStage } from './job-telemetry';
import { cleanupMinioProcessingFile } from 'src/domain/sources/application/util/minio-processing-file.helpers';

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 4 })
export class DocumentProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly preflightCheckUseCase: PreflightCheckUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly storedFiles: StoredSourceFileService,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly helper: SourceProcessingHelper,
    private readonly spreadsheetParser: SpreadsheetParserPort,
    private readonly admitOrgProcessing: AdmitOrgProcessingUseCase,
    private readonly heartbeat: SourceProcessingHeartbeatService,
    private readonly checkpoints: ProcessingCheckpointService,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { sourceId, fileName } = job.data;
    this.logger.log(
      {
        sourceId,
        fileName,
        jobId: job.id,
      },
      'Processing document',
    );
    return observeJob(job, () => this.processDocument(job));
  }

  private async processDocument(
    job: Job<DocumentProcessingJobData>,
  ): Promise<void> {
    const { sourceId, orgId, userId, minioPath } = job.data;
    // Directly uploaded originals stay in storage while their source exists;
    // only legacy staged files are the consumer's to remove.
    const cleanupPath = job.data.retainFile ? null : minioPath;

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);
      if (!(await this.isAdmitted(job))) return;

      try {
        if (!(await this.loadSourceOrSkip(sourceId, cleanupPath))) {
          await this.cleanupCheckpoints(orgId, sourceId);
          return;
        }

        await this.processSource(job, cleanupPath);
      } catch (error) {
        if (error instanceof ProcessingStoppedError) {
          await this.cleanupMinioFile(cleanupPath);
          await this.cleanupCheckpoints(orgId, sourceId);
          return;
        }
        this.logger.error(
          {
            sourceId,
            err: error as Error,
          },
          'Document processing failed',
        );

        const { final, rethrow } = classifyJobFailure(job, error);
        if (final) {
          await this.helper.markFailed(sourceId, error);
          await this.helper.cleanupIndex(sourceId);
          await this.cleanupMinioFile(cleanupPath);
          await this.cleanupCheckpoints(orgId, sourceId);
        }
        if (rethrow) throw rethrow;
      }
    });
  }

  private async processSource(
    job: Job<DocumentProcessingJobData>,
    cleanupPath: string | null,
  ): Promise<void> {
    const { sourceId, orgId } = job.data;
    const { text, chunks } = await this.heartbeat.run(sourceId, () =>
      this.downloadAndExtractText(job),
    );

    // Guard: re-check the source still exists and is PROCESSING
    // before writing content. Prevents resurrection of deleted sources.
    const source = await this.reloadIfStillProcessing(sourceId, cleanupPath);
    if (!source) {
      await this.cleanupCheckpoints(orgId, sourceId);
      return;
    }

    if (!(await this.updateSourceWithContent(source, text, chunks))) {
      await this.cleanupMinioFile(cleanupPath);
      await this.cleanupCheckpoints(orgId, sourceId);
      return;
    }
    await processingStage('document.indexing', () =>
      this.helper.index(sourceId, orgId, chunks),
    );
    await this.markSourceReady(sourceId, cleanupPath);
    await this.cleanupCheckpoints(orgId, sourceId);

    this.logger.log(
      {
        sourceId,
        chunks: chunks.length,
      },
      'Document processing complete',
    );
  }

  private async isAdmitted(
    job: Job<DocumentProcessingJobData>,
  ): Promise<boolean> {
    const admitted = await this.admitOrgProcessing.execute(
      new AdmitOrgProcessingQuery(job.data.orgId),
    );
    if (!admitted) {
      this.logger.warn(
        { jobId: job.id, orgId: job.data.orgId },
        'Organisation deleted',
      );
    }
    return admitted;
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

  private async loadSourceOrSkip(
    sourceId: UUID,
    cleanupPath: string | null,
  ): Promise<TextSource | null> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== SourceStatus.PROCESSING) {
      this.logger.warn(
        { sourceId, found: !!source },
        'Source missing or no longer processing, skipping',
      );
      await this.cleanupMinioFile(cleanupPath);
      return null;
    }

    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }

    const processingStartedAt = new Date();
    const alive =
      await this.sourceRepository.refreshProcessingHeartbeat(sourceId);
    if (!alive) {
      this.logger.warn({ sourceId }, 'Source deleted mid-load, skipping');
      await this.cleanupMinioFile(cleanupPath);
      return null;
    }
    source.processingStartedAt = processingStartedAt;

    return source;
  }

  private async downloadAndExtractText(
    job: Job<DocumentProcessingJobData>,
  ): Promise<{ text: string; chunks: TextSourceContentChunk[] }> {
    const { minioPath, fileName, fileType, expectedSize, expectedETag } =
      job.data;

    const fileBuffer = await processingStage('document.download', () =>
      job.data.retainFile
        ? this.storedFiles.readRetained(minioPath, expectedSize, expectedETag)
        : this.storedFiles.read(minioPath, expectedSize, expectedETag),
    );
    const context = this.checkpoints.create(
      job.data.orgId,
      job.data.sourceId,
      (completed) => job.updateProgress({ stage: 'extraction', completed }),
    );
    const text = await processingStage('document.extraction', () =>
      this.extractText(fileBuffer, fileName, fileType, context),
    );

    const splitResult = processingStage('document.splitting', () =>
      this.splitTextUseCase.execute(
        new SplitTextCommand(text, SplitterType.RECURSIVE, {
          chunkSize: 2000,
          chunkOverlap: 200,
        }),
      ),
    );
    const chunks = splitResult.chunks.map(
      (chunk) =>
        new TextSourceContentChunk({
          content: chunk.text,
          meta: { fileName, ...chunk.metadata },
        }),
    );

    return { text, chunks };
  }

  private async extractText(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    processingContext?: ProcessingContext,
  ): Promise<string> {
    const detected = detectFileType(fileType, fileName);
    if (isCSVFile(detected)) {
      const csv = await this.spreadsheetParser.parseCsv(
        fileBuffer.toString('utf8').replace(/^\uFEFF/, ''),
      );
      return this.requireRows(
        tableToText([{ sheetName: '', ...csv }], false),
        fileName,
      );
    }
    if (isSpreadsheetFile(detected)) {
      const sheets = await this.spreadsheetParser.parseWorkbook(fileBuffer);
      return this.requireRows(tableToText(sheets, sheets.length > 1), fileName);
    }
    // Direct uploads reach the API only as a storage reference, so the page
    // cap is enforced here, before OCR; legacy uploads were checked in-request
    // and pass again cheaply.
    await this.preflightCheckUseCase.execute(
      new PreflightCheckCommand({ fileData: fileBuffer, fileName, fileType }),
    );
    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: fileBuffer,
        fileName,
        fileType,
        processingContext,
      }),
    );
    return result.pages.map((page) => page.text).join('\n');
  }

  private requireRows(text: string, fileName: string): string {
    if (text === '') throw new EmptyFileDataError(fileName);
    return text;
  }

  private async reloadIfStillProcessing(
    sourceId: UUID,
    cleanupPath: string | null,
  ): Promise<TextSource | null> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== SourceStatus.PROCESSING) {
      this.logger.warn(
        {
          sourceId,
          found: !!source,
        },
        'Source deleted or status changed mid-processing',
      );
      await this.cleanupMinioFile(cleanupPath);
      return null;
    }
    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }
    return source;
  }

  private async updateSourceWithContent(
    source: TextSource,
    text: string,
    chunks: TextSourceContentChunk[],
  ): Promise<boolean> {
    return this.sourceRepository.saveProcessingTextSourceContent(source, {
      text,
      chunks,
    });
  }

  private async markSourceReady(
    sourceId: UUID,
    cleanupPath: string | null,
  ): Promise<void> {
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
      await this.helper.cleanupIndex(sourceId);
    }
    await this.cleanupMinioFile(cleanupPath);
  }

  private async cleanupCheckpoints(orgId: UUID, sourceId: UUID): Promise<void> {
    try {
      await this.checkpoints.cleanup(orgId, sourceId);
    } catch (error) {
      this.logger.warn(
        { err: error as Error, sourceId },
        'Failed to remove processing checkpoints',
      );
    }
  }

  private async cleanupMinioFile(cleanupPath: string | null): Promise<void> {
    if (cleanupPath === null) return;
    await cleanupMinioProcessingFile(
      this.deleteObjectUseCase,
      this.logger,
      cleanupPath,
    );
  }
}

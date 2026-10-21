import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
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
import { SourceProcessingHeartbeatService } from './source-processing-heartbeat.service';
import { observeJob, processingStage } from './job-telemetry';
import {
  cleanupMinioProcessingFile,
  downloadMinioFile,
} from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { StageStopwatch } from 'src/domain/sources/application/util/stage-stopwatch';
import {
  recordDocumentProcessingSize,
  recordDocumentProcessingStages,
  type DocumentProcessingStage,
} from 'src/domain/sources/application/util/document-processing-metrics.helper';

type Timings = StageStopwatch<DocumentProcessingStage>;

interface ExtractedText {
  text: string;
  pageCount: number;
  conversionMs?: number;
}

interface ExtractedDocument {
  text: string;
  chunks: TextSourceContentChunk[];
  fileSizeBytes: number;
  pageCount: number;
}

// Span names predate the stage metrics and are referenced by the BullMQ
// runbook, so the chunking stage keeps its original span name.
const STAGE_SPANS: Partial<Record<DocumentProcessingStage, string>> = {
  chunking: 'document.splitting',
};

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 2 })
export class DocumentProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly helper: SourceProcessingHelper,
    private readonly spreadsheetParser: SpreadsheetParserPort,
    private readonly admitOrgProcessing: AdmitOrgProcessingUseCase,
    private readonly heartbeat: SourceProcessingHeartbeatService,
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

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);
      this.contextService.set('sourceId', sourceId);
      if (!(await this.isAdmitted(job))) return;

      const timings: Timings = new StageStopwatch((stage, run) =>
        processingStage(STAGE_SPANS[stage] ?? `document.${stage}`, run),
      );
      try {
        if (!(await this.loadSourceOrSkip(sourceId, minioPath))) return;

        const extracted = await this.heartbeat.run(sourceId, () =>
          this.downloadAndExtractText(job.data, timings),
        );

        // Guard: re-check the source still exists and is PROCESSING
        // before writing content. Prevents resurrection of deleted sources.
        const source = await this.reloadIfStillProcessing(sourceId, minioPath);
        if (!source) return;

        await timings.measure('persist', () =>
          this.updateSourceWithContent(
            source,
            extracted.text,
            extracted.chunks,
          ),
        );
        await this.indexChunks(sourceId, orgId, extracted.chunks, timings);
        await this.markSourceReady(sourceId, minioPath);
        this.reportCompleted(job.data, extracted, timings);
      } catch (error) {
        await this.handleFailure(job, error, timings);
      }
    });
  }

  private async indexChunks(
    sourceId: UUID,
    orgId: UUID,
    chunks: TextSourceContentChunk[],
    timings: Timings,
  ): Promise<void> {
    const outcome = await timings.measure('indexing', () =>
      this.helper.index(sourceId, orgId, chunks),
    );
    timings.record('embedding', outcome.embeddingMs);
    timings.record('indexing', outcome.indexingMs);
  }

  private reportCompleted(
    jobData: DocumentProcessingJobData,
    extracted: ExtractedDocument,
    timings: Timings,
  ): void {
    const fileType = detectFileType(jobData.fileType, jobData.fileName);
    const totalMs = timings.elapsedMs();
    const { fileSizeBytes, pageCount } = extracted;
    this.logger.log(
      {
        sourceId: jobData.sourceId,
        fileType,
        fileSizeBytes,
        pageCount,
        chunks: extracted.chunks.length,
        ...timings.report(),
        totalMs: Math.round(totalMs),
      },
      'Document processing complete',
    );
    recordDocumentProcessingStages(
      { ...timings.values(), total: totalMs },
      fileType,
    );
    recordDocumentProcessingSize({ fileSizeBytes, pageCount }, fileType);
  }

  private async handleFailure(
    job: Job<DocumentProcessingJobData>,
    error: unknown,
    timings: Timings,
  ): Promise<void> {
    const { sourceId, minioPath } = job.data;
    this.logger.error(
      {
        sourceId,
        failedStage: timings.failedStage,
        elapsedMs: Math.round(timings.elapsedMs()),
        err: error as Error,
      },
      'Document processing failed',
    );

    const { final, rethrow } = classifyJobFailure(job, error);
    if (final) {
      await this.helper.markFailed(sourceId, error);
      await this.helper.cleanupIndex(sourceId);
      await this.cleanupMinioFile(minioPath);
    }
    if (rethrow) throw rethrow;
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
    minioPath: string,
  ): Promise<TextSource | null> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== SourceStatus.PROCESSING) {
      this.logger.warn(
        { sourceId, found: !!source },
        'Source missing or no longer processing, skipping',
      );
      await this.cleanupMinioFile(minioPath);
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
      await this.cleanupMinioFile(minioPath);
      return null;
    }
    source.processingStartedAt = processingStartedAt;

    return source;
  }

  private async downloadAndExtractText(
    jobData: DocumentProcessingJobData,
    timings: Timings,
  ): Promise<ExtractedDocument> {
    const { minioPath, fileName, fileType } = jobData;

    const fileBuffer = await timings.measure('download', () =>
      this.downloadFile(minioPath),
    );
    const { text, pageCount, conversionMs } = await timings.measure(
      'extraction',
      () => this.extractText(fileBuffer, fileName, fileType),
    );
    if (conversionMs !== undefined) {
      timings.record('conversion', conversionMs);
      timings.record('extraction', timings.get('extraction') - conversionMs);
    }

    const splitResult = await timings.measure('chunking', () =>
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

    return { text, chunks, pageCount, fileSizeBytes: fileBuffer.length };
  }

  private async extractText(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
  ): Promise<ExtractedText> {
    const detected = detectFileType(fileType, fileName);
    if (isCSVFile(detected)) {
      const csv = await this.spreadsheetParser.parseCsv(
        fileBuffer.toString('utf8').replace(/^\uFEFF/, ''),
      );
      const text = tableToText([{ sheetName: '', ...csv }], false);
      return { text: this.requireRows(text, fileName), pageCount: 1 };
    }
    if (isSpreadsheetFile(detected)) {
      const sheets = await this.spreadsheetParser.parseWorkbook(fileBuffer);
      const text = tableToText(sheets, sheets.length > 1);
      return {
        text: this.requireRows(text, fileName),
        pageCount: sheets.length,
      };
    }
    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: fileBuffer,
        fileName,
        fileType,
      }),
    );
    return {
      text: result.pages.map((page) => page.text).join('\n'),
      pageCount: result.pages.length,
      conversionMs: result.conversionMs,
    };
  }

  private requireRows(text: string, fileName: string): string {
    if (text === '') throw new EmptyFileDataError(fileName);
    return text;
  }

  private async reloadIfStillProcessing(
    sourceId: UUID,
    minioPath: string,
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
      await this.cleanupMinioFile(minioPath);
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
  ): Promise<void> {
    await this.sourceRepository.saveTextSource(source, { text, chunks });
  }

  private async markSourceReady(
    sourceId: UUID,
    minioPath: string,
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
    await this.cleanupMinioFile(minioPath);
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

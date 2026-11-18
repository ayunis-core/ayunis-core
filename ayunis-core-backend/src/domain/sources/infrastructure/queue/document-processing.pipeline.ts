import {
  ProcessingStoppedError,
  type ProcessingContext,
} from 'src/common/types/processing-context';
import { ProcessingCheckpointService } from 'src/domain/sources/application/services/processing-checkpoint.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { tmpdir } from 'os';
import { join } from 'path';
import transcriptionConfig from 'src/config/transcription.config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bullmq';
import type { UUID } from 'crypto';
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
import { EarlyEmbeddingService } from 'src/domain/sources/application/services/early-embedding.service';
import { SOURCE_CHUNKING } from 'src/domain/sources/application/util/source-chunking.helper';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import {
  ProcessingDeferredError,
  type DocumentToProcess,
} from 'src/domain/sources/application/models/document-to-process';
import { findProviderOutage } from 'src/common/errors/find-provider-outage.helper';
import { TranscriptReadyEvent } from 'src/domain/sources/application/events/transcript-ready.event';
import { SpreadsheetParserPort } from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import { tableToText } from 'src/domain/sources/application/util/table-to-text';
import {
  detectFileType,
  isAudioFile,
  isCSVFile,
  isOfficeDocumentFile,
  isSpreadsheetFile,
  type DetectedFileType,
} from 'src/common/util/file-type';
import type { LocalFile } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { EmptyFileDataError } from 'src/domain/sources/application/sources.errors';
import { classifyJobFailure } from './bullmq-job.helpers';
import { SourceProcessingHeartbeatService } from 'src/domain/sources/application/services/source-processing-heartbeat.service';
import { processingStage } from './job-telemetry';
import { cleanupMinioProcessingFile } from 'src/domain/sources/application/util/minio-processing-file.helpers';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import { SourceTranscriptContentService } from 'src/domain/sources/application/services/source-transcript-content.service';
import { audioStagingRoot, withStagedJobFile } from './staged-job-file';
import {
  RecordingTranscriptExtractor,
  type ExtractedContent,
} from './recording-transcript.extractor';

function isProcessedFromDisk(fileType: DetectedFileType): boolean {
  return fileType === 'pdf' || isOfficeDocumentFile(fileType);
}

/**
 * The document pipeline of a queue job: download, extract, chunk, index and
 * settle the source as READY, or as FAILED once no retry follows. Shared by
 * the queues whose jobs end in a document (uploads, synced files); the
 * caller sets up the job's context and admits its organisation first.
 */
@Injectable()
export class DocumentProcessingPipeline {
  private readonly logger = new Logger(DocumentProcessingPipeline.name);

  constructor(
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly preflightCheckUseCase: PreflightCheckUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly storedFiles: StoredSourceFileService,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly helper: SourceProcessingHelper,
    private readonly spreadsheetParser: SpreadsheetParserPort,
    private readonly heartbeat: SourceProcessingHeartbeatService,
    private readonly checkpoints: ProcessingCheckpointService,
    private readonly earlyEmbedding: EarlyEmbeddingService,
    private readonly recordingTranscripts: RecordingTranscriptExtractor,
    private readonly transcriptContent: SourceTranscriptContentService,
    @Inject(transcriptionConfig.KEY)
    private readonly transcription: ConfigType<typeof transcriptionConfig>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async process(job: Job, document: DocumentToProcess): Promise<void> {
    const { sourceId, orgId, minioPath } = document;
    // Directly uploaded originals stay in storage while their source exists;
    // only legacy staged files are the consumer's to remove.
    const cleanupPath = document.retainFile ? null : minioPath;

    try {
      if (!(await this.loadSourceOrSkip(sourceId, cleanupPath))) {
        await this.cleanupCheckpoints(orgId, sourceId);
        return;
      }

      await this.processSource(job, document, cleanupPath);
    } catch (error) {
      if (error instanceof ProcessingStoppedError) {
        await this.cleanupMinioFile(cleanupPath);
        await this.cleanupCheckpoints(orgId, sourceId);
        return;
      }
      if (document.deferProviderOutages && findProviderOutage(error))
        throw new ProcessingDeferredError(error);
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
  }

  private async processSource(
    job: Job,
    document: DocumentToProcess,
    cleanupPath: string | null,
  ): Promise<void> {
    const { sourceId, orgId } = document;
    const content = await this.heartbeat.run(sourceId, () =>
      this.downloadAndExtractText(job, document),
    );

    // Guard: re-check the source still exists and is PROCESSING
    // before writing content. Prevents resurrection of deleted sources.
    const source = await this.reloadIfStillProcessing(sourceId, cleanupPath);
    if (!source) {
      await this.cleanupCheckpoints(orgId, sourceId);
      return;
    }

    if (!(await this.updateSourceWithContent(source, content))) {
      await this.cleanupMinioFile(cleanupPath);
      await this.cleanupCheckpoints(orgId, sourceId);
      return;
    }
    const { chunks, precomputedEmbeddings } = content;
    await processingStage('document.indexing', () =>
      this.helper.index(sourceId, orgId, chunks, precomputedEmbeddings),
    );
    const ready = await this.markSourceReady(sourceId, cleanupPath);
    await this.cleanupCheckpoints(orgId, sourceId);
    if (ready) await this.helper.reindexIfModelChanged(sourceId, orgId);
    if (ready && document.keepTranscriptSegments) {
      await this.announceTranscript(document);
    }

    this.logger.log(
      {
        sourceId,
        chunks: chunks.length,
      },
      'Document processing complete',
    );
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
    job: Job,
    document: DocumentToProcess,
  ): Promise<ExtractedContent> {
    const { fileName, fileType, orgId, sourceId } = document;
    const progress = (completed: number) =>
      job.updateProgress({ stage: 'extraction', completed });
    // A kept transcript is chunked by speaker turn, not by the text splitter
    // the early embeddings are computed for.
    if (document.keepTranscriptSegments)
      return this.recordingTranscripts.extract(
        document,
        this.checkpoints.create(orgId, sourceId, progress),
      );
    const early = this.earlyEmbedding.start(orgId);
    const context = this.checkpoints.create(
      orgId,
      sourceId,
      progress,
      (texts) => early.appendPages(texts),
    );
    let text: string;
    let precomputedEmbeddings: PreparedContentEmbeddings | undefined;
    try {
      text = await (isAudioFile(detectFileType(fileType, fileName))
        ? this.transcribeRecording(document, context)
        : this.extractDocument(document, context));
    } finally {
      precomputedEmbeddings = await early.finish();
    }

    const splitResult = processingStage('document.splitting', () =>
      this.splitTextUseCase.execute(
        new SplitTextCommand(text, SplitterType.RECURSIVE, SOURCE_CHUNKING),
      ),
    );
    const chunks = splitResult.chunks.map(
      (chunk) =>
        new TextSourceContentChunk({
          content: chunk.text,
          meta: { fileName, ...chunk.metadata },
        }),
    );

    return { text, chunks, precomputedEmbeddings };
  }

  private async extractDocument(
    document: DocumentToProcess,
    context?: ProcessingContext,
  ): Promise<string> {
    const { fileName, fileType } = document;
    if (!isProcessedFromDisk(detectFileType(fileType, fileName))) {
      return this.extractBuffered(document, context);
    }
    return this.withStagedFile(
      document,
      join(tmpdir(), 'ayunis-documents'),
      async (localFile) => {
        // Direct uploads reach the API only as a storage reference, so the
        // page cap is enforced here, before OCR.
        await this.preflightCheckUseCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.alloc(0),
            localFile,
            fileName,
            fileType,
          }),
        );
        return this.retrieveText(document, localFile, context);
      },
    );
  }

  private async extractBuffered(
    document: DocumentToProcess,
    context?: ProcessingContext,
  ): Promise<string> {
    const { minioPath, fileName, fileType, expectedSize, expectedETag } =
      document;
    const fileBuffer = await processingStage('document.download', () =>
      document.retainFile
        ? this.storedFiles.readRetained(minioPath, expectedSize, expectedETag)
        : this.storedFiles.read(minioPath, expectedSize, expectedETag),
    );
    return processingStage('document.extraction', () =>
      this.extractText(fileBuffer, fileName, fileType, context),
    );
  }

  private transcribeRecording(
    document: DocumentToProcess,
    context?: ProcessingContext,
  ): Promise<string> {
    const root = audioStagingRoot(this.transcription);
    return this.withStagedFile(document, root, (localFile) =>
      this.retrieveText(document, localFile, context),
    );
  }

  private withStagedFile<T>(
    document: DocumentToProcess,
    root: string,
    use: (localFile: LocalFile) => Promise<T>,
  ): Promise<T> {
    return withStagedJobFile(this.storedFiles, document, root, use);
  }

  private async retrieveText(
    document: DocumentToProcess,
    localFile: LocalFile,
    processingContext?: ProcessingContext,
  ): Promise<string> {
    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: Buffer.alloc(0),
        localFile,
        fileName: document.fileName,
        fileType: document.fileType,
        processingContext,
      }),
    );
    return result.pages.map((page) => page.text).join('\n');
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
    { text, chunks, segments }: ExtractedContent,
  ): Promise<boolean> {
    if (segments)
      return this.transcriptContent.save(source, { text, chunks }, segments);
    return this.sourceRepository.saveProcessingTextSourceContent(source, {
      text,
      chunks,
    });
  }

  private async markSourceReady(
    sourceId: UUID,
    cleanupPath: string | null,
  ): Promise<boolean> {
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
    return updated;
  }

  // The source is READY whatever its listeners do, so their failures must not
  // fail (and retry) the processing job.
  private async announceTranscript({
    sourceId,
    orgId,
  }: DocumentToProcess): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(
        TranscriptReadyEvent.EVENT_NAME,
        new TranscriptReadyEvent(sourceId, orgId),
      );
    } catch (error) {
      this.logger.error(
        { sourceId, err: error as Error },
        'Transcript ready listener failed',
      );
    }
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

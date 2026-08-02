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
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceProcessingStage } from 'src/domain/sources/domain/source-processing-progress';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from '../../application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { classifyJobFailure } from './bullmq-job.helpers';
import { downloadMinioFile } from '../../application/util/minio-processing-file.helpers';
import {
  CheckpointedPage,
  ExtractionCheckpointStore,
} from './extraction-checkpoint.store';

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 2 })
export class DocumentProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly helper: SourceProcessingHelper,
    private readonly checkpointStore: ExtractionCheckpointStore,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { sourceId, orgId, userId, fileName } = job.data;

    this.logger.log('Processing document', {
      sourceId,
      fileName,
      jobId: job.id,
    });

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);
      const processingDir = `${orgId}/processing/${sourceId}`;

      try {
        const source = await this.loadSourceOrSkip(sourceId, processingDir);
        if (!source) return;

        const { text, chunks } = await this.downloadAndExtractText(
          job.data,
          processingDir,
        );

        // Guard: re-check the source still exists and is PROCESSING
        // before writing content. Prevents resurrection of deleted sources.
        if (!(await this.isSourceStillProcessing(sourceId, processingDir))) {
          return;
        }

        await this.updateSourceWithContent(source, text, chunks);
        await this.sourceRepository.updateProcessingProgress(sourceId, {
          stage: SourceProcessingStage.INDEXING,
        });
        await this.helper.index(sourceId, orgId, chunks);
        await this.markSourceReady(sourceId, processingDir);

        this.logger.log('Document processing complete', {
          sourceId,
          chunks: chunks.length,
        });
      } catch (error) {
        this.logger.error('Document processing failed', {
          sourceId,
          error: error as Error,
        });

        const { final, rethrow } = classifyJobFailure(job, error);
        if (final) {
          await this.helper.markFailed(
            sourceId,
            error instanceof Error ? error.message : 'Unknown processing error',
          );
          await this.helper.cleanupIndex(sourceId);
          await this.purgeProcessingFiles(processingDir);
        }
        // Extraction checkpoints are only purged on final failure, so a
        // retried attempt resumes from them.
        if (rethrow) throw rethrow;
      }
    });
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
    processingDir: string,
  ): Promise<TextSource | null> {
    const source = await this.sourceRepository.findById(sourceId);
    if (!source) {
      this.logger.warn('Source not found, skipping', { sourceId });
      await this.purgeProcessingFiles(processingDir);
      return null;
    }

    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }

    // Reset processingStartedAt on every attempt so the stale-cleanup
    // cron doesn't race with BullMQ retries on long-running jobs. Guarded
    // UPDATE, not save(): save() would re-insert a row deleted since the
    // findById above.
    const alive =
      await this.sourceRepository.refreshProcessingHeartbeat(sourceId);
    if (!alive) {
      this.logger.warn('Source deleted mid-load, skipping', { sourceId });
      await this.purgeProcessingFiles(processingDir);
      return null;
    }

    return source;
  }

  private async downloadAndExtractText(
    jobData: DocumentProcessingJobData,
    processingDir: string,
  ): Promise<{ text: string; chunks: TextSourceContentChunk[] }> {
    const { sourceId, minioPath, fileName, fileType } = jobData;

    const fileBuffer = await downloadMinioFile(
      this.downloadObjectUseCase,
      minioPath,
    );
    const restored = await this.checkpointStore.restore(processingDir);
    if (restored.length > 0) {
      this.logger.log('Resuming extraction from checkpoints', {
        sourceId,
        checkpointedPages: restored.length,
      });
    }

    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: fileBuffer,
        fileName,
        fileType,
        skipPages: restored.map((page) => page.number - 1),
        onBatchExtracted: async ({ pages, processedPages, totalPages }) => {
          await this.checkpointStore.saveBatch(
            processingDir,
            pages.map((page) => ({ number: page.number, text: page.text })),
          );
          await this.sourceRepository.updateProcessingProgress(sourceId, {
            stage: SourceProcessingStage.EXTRACTING,
            processedPages,
            totalPages,
          });
        },
      }),
    );

    const allPages: CheckpointedPage[] = [
      ...restored,
      ...result.pages.map((page) => ({ number: page.number, text: page.text })),
    ].sort((a, b) => a.number - b.number);
    const text = allPages.map((page) => page.text).join('\n');

    return { text, chunks: this.splitIntoChunks(text, fileName) };
  }

  private splitIntoChunks(
    text: string,
    fileName: string,
  ): TextSourceContentChunk[] {
    const splitResult = this.splitTextUseCase.execute(
      new SplitTextCommand(text, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );
    return splitResult.chunks.map(
      (chunk) =>
        new TextSourceContentChunk({
          content: chunk.text,
          meta: { fileName, ...chunk.metadata },
        }),
    );
  }

  private async isSourceStillProcessing(
    sourceId: UUID,
    processingDir: string,
  ): Promise<boolean> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== SourceStatus.PROCESSING) {
      this.logger.warn('Source deleted or status changed mid-processing', {
        sourceId,
        found: !!source,
      });
      await this.purgeProcessingFiles(processingDir);
      return false;
    }
    return true;
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
    processingDir: string,
  ): Promise<void> {
    const updated = await this.sourceRepository.updateStatusConditionally(
      sourceId,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null, processingProgress: null },
    );
    if (!updated) {
      this.logger.warn(
        'Conditional update to READY failed — source was deleted or status changed',
        { sourceId },
      );
      await this.helper.cleanupIndex(sourceId);
    }
    await this.purgeProcessingFiles(processingDir);
  }

  /** Removes the staged file and any extraction checkpoints; best-effort. */
  private async purgeProcessingFiles(processingDir: string): Promise<void> {
    try {
      await this.purgeStoragePrefixesUseCase.execute(
        new PurgeStoragePrefixesCommand([`${processingDir}/`]),
      );
    } catch (error) {
      this.logger.warn('Failed to purge processing files', {
        processingDir,
        error: error as Error,
      });
    }
  }
}

import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

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
import {
  cleanupMinioProcessingFile,
  downloadMinioFile,
} from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { classifyJobFailure } from './bullmq-job.helpers';

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 2 })
export class DocumentProcessingConsumer extends WorkerHost {
  constructor(
    @InjectPinoLogger(DocumentProcessingConsumer.name)
    private readonly logger: PinoLogger,
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly helper: SourceProcessingHelper,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { sourceId, orgId, userId, minioPath, fileName } = job.data;

    this.logger.info(
      {
        sourceId,
        fileName,
        jobId: job.id,
      },
      'Processing document',
    );

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);

      try {
        const source = await this.loadSourceOrSkip(sourceId, minioPath);
        if (!source) return;

        const { text, chunks } = await this.downloadAndExtractText(job.data);

        // Guard: re-check the source still exists and is PROCESSING
        // before writing content. Prevents resurrection of deleted sources.
        if (!(await this.isSourceStillProcessing(sourceId, minioPath))) return;

        await this.updateSourceWithContent(source, text, chunks);
        await this.helper.index(sourceId, orgId, chunks);
        await this.markSourceReady(sourceId, minioPath);

        this.logger.info(
          {
            sourceId,
            chunks: chunks.length,
          },
          'Document processing complete',
        );
      } catch (error) {
        this.logger.error(
          {
            sourceId,
            err: error as Error,
          },
          'Document processing failed',
        );

        const { final, rethrow } = classifyJobFailure(job, error);
        if (final) {
          await this.helper.markFailed(
            sourceId,
            error instanceof Error ? error.message : 'Unknown processing error',
          );
          await this.helper.cleanupIndex(sourceId);
          await this.cleanupMinioFile(minioPath);
        }
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
    minioPath: string,
  ): Promise<TextSource | null> {
    const source = await this.sourceRepository.findById(sourceId);
    if (!source) {
      this.logger.warn({ sourceId }, 'Source not found, skipping');
      await this.cleanupMinioFile(minioPath);
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
      this.logger.warn({ sourceId }, 'Source deleted mid-load, skipping');
      await this.cleanupMinioFile(minioPath);
      return null;
    }

    return source;
  }

  private async downloadAndExtractText(
    jobData: DocumentProcessingJobData,
  ): Promise<{ text: string; chunks: TextSourceContentChunk[] }> {
    const { minioPath, fileName, fileType } = jobData;

    const fileBuffer = await this.downloadFile(minioPath);
    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: fileBuffer,
        fileName,
        fileType,
      }),
    );
    const text = result.pages.map((page) => page.text).join('\n');

    const splitResult = this.splitTextUseCase.execute(
      new SplitTextCommand(text, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
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

  private async isSourceStillProcessing(
    sourceId: UUID,
    minioPath: string,
  ): Promise<boolean> {
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

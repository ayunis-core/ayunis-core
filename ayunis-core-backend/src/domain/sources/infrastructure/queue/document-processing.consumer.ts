import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { IngestContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.use-case';
import { IngestContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from '../../application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';

/** Max concurrent embedding API calls to avoid rate limits */
const EMBEDDING_CONCURRENCY = 20;

@Processor(DOCUMENT_PROCESSING_QUEUE, { concurrency: 2 })
export class DocumentProcessingConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly ingestContentUseCase: IngestContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
  ) {
    super();
  }

  async process(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { sourceId, orgId, userId, minioPath, fileName } = job.data;

    this.logger.log('Processing document', {
      sourceId,
      fileName,
      jobId: job.id,
    });

    // Set up CLS context so downstream use cases (Mistral, etc.) work
    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);

      try {
        const source = await this.loadSourceOrSkip(sourceId, minioPath);
        if (!source) return;

        const { text, chunks } = await this.downloadAndExtractText(job.data);
        await this.updateSourceWithContent(source, text, chunks);
        await this.indexChunks(sourceId, orgId, chunks);
        await this.markSourceReady(source, minioPath);

        this.logger.log('Document processing complete', {
          sourceId,
          chunks: chunks.length,
        });
      } catch (error) {
        this.logger.error('Document processing failed', {
          sourceId,
          error: error as Error,
        });

        const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;
        if (isLastAttempt) {
          await this.markSourceFailed(
            sourceId,
            error instanceof Error ? error.message : 'Unknown processing error',
          );
          await this.cleanupPartialIndex(sourceId);
          await this.cleanupMinioFile(minioPath);
        }
        throw error; // Re-throw so BullMQ handles retries
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
      this.logger.warn('Source not found, skipping', { sourceId });
      await this.cleanupMinioFile(minioPath);
      return null;
    }

    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }

    // Reset processingStartedAt on every attempt so the stale-cleanup
    // cron doesn't race with BullMQ retries on long-running jobs.
    source.processingStartedAt = new Date();
    await this.sourceRepository.save(source);

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

  private async updateSourceWithContent(
    source: TextSource,
    text: string,
    chunks: TextSourceContentChunk[],
  ): Promise<void> {
    await this.sourceRepository.saveTextSource(source, { text, chunks });
  }

  private async markSourceReady(
    source: TextSource,
    minioPath: string,
  ): Promise<void> {
    source.status = SourceStatus.READY;
    source.processingError = null;
    await this.sourceRepository.save(source);
    await this.cleanupMinioFile(minioPath);
  }

  private async downloadFile(minioPath: string): Promise<Buffer> {
    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(minioPath),
    );
    return this.streamToBuffer(stream);
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async indexChunks(
    sourceId: UUID,
    orgId: UUID,
    chunks: TextSourceContentChunk[],
  ): Promise<void> {
    // Delete any existing index entries (handles re-processing)
    await this.deleteContentUseCase.execute(
      new DeleteContentCommand({ documentId: sourceId }),
    );

    // Dynamic import required: p-limit is ESM-only, our codebase uses CJS
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(EMBEDDING_CONCURRENCY);
    await Promise.all(
      chunks.map((chunk) =>
        limit(async () => {
          await this.ingestContentUseCase.execute(
            new IngestContentCommand({
              orgId,
              documentId: sourceId,
              chunkId: chunk.id,
              content: chunk.content,
              type: IndexType.PARENT_CHILD,
            }),
          );
        }),
      ),
    );
  }

  private async markSourceFailed(
    sourceId: UUID,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({ sourceId, errorMessage }),
      );
    } catch (err) {
      this.logger.error('Failed to mark source as failed', {
        sourceId,
        error: err as Error,
      });
    }
  }

  private async cleanupPartialIndex(sourceId: UUID): Promise<void> {
    try {
      await this.deleteContentUseCase.execute(
        new DeleteContentCommand({ documentId: sourceId }),
      );
    } catch (err) {
      this.logger.warn('Failed to clean up partial vector index entries', {
        sourceId,
        error: err as Error,
      });
    }
  }

  private async cleanupMinioFile(minioPath: string): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(minioPath),
      );
    } catch (err) {
      this.logger.warn('Failed to clean up MinIO processing file', {
        minioPath,
        error: err as Error,
      });
    }
  }
}

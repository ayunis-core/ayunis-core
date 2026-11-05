import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { detectFileType, isCSVFile } from 'src/common/util/file-type';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadPipeline } from 'src/domain/sources/domain/upload/source-upload-pipeline.enum';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { EnqueueDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { EnqueueDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.command';
import { EnqueueDataSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-data-source-processing/enqueue-data-source-processing.use-case';
import { EnqueueDataSourceProcessingCommand } from 'src/domain/sources/application/use-cases/enqueue-data-source-processing/enqueue-data-source-processing.command';

/**
 * Queues the processing job(s) of a session whose sources already exist and
 * marks it COMPLETED once the queue accepted them. Job ids derive from source
 * ids, so a retry after a lost acknowledgement never duplicates work. Shared
 * by upload completion and the sweep that retries sessions left behind when
 * queueing failed after the sources were saved.
 */
@Injectable()
export class SourceUploadQueueingService {
  private readonly logger = new Logger(SourceUploadQueueingService.name);

  constructor(
    private readonly sessions: SourceUploadSessionRepository,
    private readonly enqueueDocumentProcessing: EnqueueDocumentProcessingUseCase,
    private readonly enqueueDataSourceProcessing: EnqueueDataSourceProcessingUseCase,
  ) {}

  /** Returns true once the session is COMPLETED; false leaves it for a retry. */
  async tryQueue(session: SourceUploadSession): Promise<boolean> {
    try {
      await this.enqueue(session);
    } catch (error) {
      this.logger.error(
        { uploadId: session.id, err: error as Error },
        'Failed to queue processing for a completed upload; will retry',
      );
      return false;
    }
    await this.sessions.transition(
      session.id,
      SourceUploadSessionStatus.SOURCES_CREATED,
      SourceUploadSessionStatus.COMPLETED,
    );
    return true;
  }

  private async enqueue(session: SourceUploadSession): Promise<void> {
    if (session.pipeline === SourceUploadPipeline.DATA_SOURCE) {
      const detected = detectFileType(session.fileType, session.fileName);
      await this.enqueueDataSourceProcessing.execute(
        new EnqueueDataSourceProcessingCommand({
          uploadId: session.id,
          orgId: session.orgId,
          userId: session.userId,
          minioPath: session.storageKey,
          fileName: session.fileName,
          kind: isCSVFile(detected) ? 'csv' : 'spreadsheet',
          targets: session.sources,
          retainFile: true,
          expectedSize: session.fileSize,
          expectedETag: session.expectedETag ?? undefined,
        }),
      );
      return;
    }

    for (const source of session.sources) {
      await this.enqueueDocument(session, source.sourceId);
    }
  }

  private async enqueueDocument(
    session: SourceUploadSession,
    sourceId: UUID,
  ): Promise<void> {
    await this.enqueueDocumentProcessing.execute(
      new EnqueueDocumentProcessingCommand({
        sourceId,
        orgId: session.orgId,
        userId: session.userId,
        minioPath: session.storageKey,
        fileName: session.fileName,
        fileType: session.fileType,
        retainFile: true,
        expectedSize: session.fileSize,
        expectedETag: session.expectedETag ?? undefined,
      }),
    );
  }
}

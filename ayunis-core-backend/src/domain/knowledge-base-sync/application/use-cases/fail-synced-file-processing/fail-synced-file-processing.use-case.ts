import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedFileDocuments } from 'src/domain/knowledge-base-sync/application/services/synced-file-documents.service';
import { classifySourceProcessingError } from 'src/domain/sources/application/services/classify-source-processing-error';
import { FailSyncedFileProcessingCommand } from './fail-synced-file-processing.command';

/**
 * Records that a synced file's version could not be read or stored for
 * good, with the processing error codes of documents, so that version is not
 * queued again (`SyncedFileDocuments.fail`).
 */
@Injectable()
export class FailSyncedFileProcessingUseCase {
  private readonly logger = new Logger(FailSyncedFileProcessingUseCase.name);

  constructor(private readonly documents: SyncedFileDocuments) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: FailSyncedFileProcessingCommand): Promise<void> {
    const { job, error } = command;
    this.logger.log({ syncedFileId: job.syncedFileId }, 'execute');
    await this.documents.fail(
      job,
      classifySourceProcessingError(error),
      error instanceof Error ? error.message : 'Unknown processing error',
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedFileDocuments } from 'src/domain/knowledge-base-sync/application/services/synced-file-documents.service';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { CompleteSyncedFileProcessingCommand } from './complete-synced-file-processing.command';

/**
 * Settles a synced file's version once the document pipeline is done with
 * its replacement (`SyncedFileDocuments.settle`); a replacement still
 * PROCESSING waits for the job's retry. True when an indexed replacement
 * took the document's place, which the caller then checks against the
 * organisation's current embedding model.
 */
@Injectable()
export class CompleteSyncedFileProcessingUseCase {
  private readonly logger = new Logger(
    CompleteSyncedFileProcessingUseCase.name,
  );

  constructor(
    private readonly getSources: GetSourcesByIdsUseCase,
    private readonly documents: SyncedFileDocuments,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(
    command: CompleteSyncedFileProcessingCommand,
  ): Promise<boolean> {
    const { job, replacementId } = command;
    this.logger.log(
      { syncedFileId: job.syncedFileId, replacementId },
      'execute',
    );
    const replacement = (
      await this.getSources.execute(new GetSourcesByIdsQuery([replacementId]))
    ).at(0);
    if (!replacement || replacement.status === SourceStatus.PROCESSING)
      return false;
    const tookPlace = await this.documents.settle(job, replacement);
    return tookPlace && replacement.status !== SourceStatus.FAILED;
  }
}

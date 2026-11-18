import type { UUID } from 'crypto';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';

export class CompleteSyncedFileProcessingCommand {
  constructor(
    public readonly job: SyncedFileJobData,
    /** The replacement the document pipeline processed for the job. */
    public readonly replacementId: UUID,
  ) {}
}

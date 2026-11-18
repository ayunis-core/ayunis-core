import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';

export class FailSyncedFileProcessingCommand {
  constructor(
    public readonly job: SyncedFileJobData,
    /** Why the content could not be read or stored, after the last retry. */
    public readonly error: unknown,
  ) {}
}

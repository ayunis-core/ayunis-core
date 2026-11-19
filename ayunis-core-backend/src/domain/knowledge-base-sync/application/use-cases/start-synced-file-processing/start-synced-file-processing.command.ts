import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';

export class StartSyncedFileProcessingCommand {
  constructor(public readonly job: SyncedFileJobData) {}
}

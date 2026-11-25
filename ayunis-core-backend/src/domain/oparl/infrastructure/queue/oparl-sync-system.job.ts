import type { UUID } from 'crypto';
import type { OparlDocumentsProgress } from 'src/domain/oparl/application/models/oparl-documents-progress';
import type { OparlSyncProgress } from 'src/domain/oparl/application/models/oparl-sync-progress';

export interface OparlSyncSystemJobData {
  systemId: UUID;
  /** Set once the run started; a retried or stalled job resumes from it. */
  progress?: OparlSyncProgress;
}

export interface OparlDocumentsJobData {
  systemId: UUID;
  /** Set once the job started; its next slice goes on from it. */
  progress?: OparlDocumentsProgress;
}

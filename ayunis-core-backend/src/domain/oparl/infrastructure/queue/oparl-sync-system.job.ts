import type { UUID } from 'crypto';
import type { OparlSyncProgress } from 'src/domain/oparl/application/models/oparl-sync-progress';

export interface OparlSyncSystemJobData {
  systemId: UUID;
  /** Set once the run started; a retried or stalled job resumes from it. */
  progress?: OparlSyncProgress;
}

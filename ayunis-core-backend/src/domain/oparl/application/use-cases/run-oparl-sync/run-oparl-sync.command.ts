import type { UUID } from 'crypto';
import type { OparlSyncProgress } from 'src/domain/oparl/application/models/oparl-sync-progress';

export class RunOparlSyncCommand {
  constructor(
    readonly systemId: UUID,
    /** Where an interrupted run stood; `null` to start a new run. */
    readonly progress: OparlSyncProgress | null,
    readonly saveProgress: (progress: OparlSyncProgress) => Promise<void>,
    /** Aborted on shutdown; the run then throws `OparlSyncInterruptedError` and stays running. */
    readonly signal: AbortSignal,
  ) {}
}

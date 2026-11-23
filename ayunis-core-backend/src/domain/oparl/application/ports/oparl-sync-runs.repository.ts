import type { UUID } from 'crypto';
import type { OparlSyncRun } from 'src/domain/oparl/domain/oparl-sync-run.entity';

export abstract class OparlSyncRunsRepository {
  abstract create(run: OparlSyncRun): Promise<void>;

  abstract findById(id: UUID): Promise<OparlSyncRun | null>;

  /** Writes status, end, error and stats. */
  abstract update(run: OparlSyncRun): Promise<void>;

  /** Ends the system's running runs other than `exceptRunId` as failed, e.g. after a lost worker; returns their IDs. */
  abstract failRunning(
    systemId: UUID,
    exceptRunId: UUID,
    error: string,
    now: Date,
  ): Promise<UUID[]>;

  abstract findRunning(systemIds: UUID[]): Promise<OparlSyncRun[]>;
}

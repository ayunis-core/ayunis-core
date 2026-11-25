import type { UUID } from 'crypto';
import type {
  OparlSystem,
  OparlSystemMetadata,
} from 'src/domain/oparl/domain/oparl-system.entity';

export abstract class OparlSystemsRepository {
  /** `false` when a system with the same URL or OParl ID exists. */
  abstract createIfAbsent(system: OparlSystem): Promise<boolean>;

  abstract findById(id: UUID): Promise<OparlSystem | null>;

  abstract existsWithUrl(url: string): Promise<boolean>;

  abstract findAll(): Promise<OparlSystem[]>;

  /**
   * Up to `limit` systems due at `now`, oldest first; each moved to
   * `leaseUntil`, so a run lost on the way is retried then.
   */
  abstract claimDue(
    now: Date,
    leaseUntil: Date,
    limit: number,
  ): Promise<UUID[]>;

  /** Writes what the system says about itself, except its OParl ID. */
  abstract updateMetadata(
    id: UUID,
    metadata: OparlSystemMetadata,
  ): Promise<void>;

  /** Writes the sync state only (schedule, last run). */
  abstract updateSyncState(system: OparlSystem): Promise<void>;
}

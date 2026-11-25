import type { UUID } from 'crypto';
import type { OparlSyncRunStats } from 'src/domain/oparl/domain/oparl-sync-run.entity';

/**
 * Where a run stands, kept outside the database so a run interrupted with
 * its worker resumes: per list (`<body OParl ID> <property>`) the next page
 * to fetch, `null` once the list is done.
 */
export interface OparlSyncProgress {
  runId: UUID;
  cursors: Record<string, string | null>;
  /** Items without ID skipped so far; any makes the listing incomplete. */
  invalidObjects?: number;
  /** The run's stats so far, so a resumed run reports all of its work. */
  stats?: OparlSyncRunStats;
}

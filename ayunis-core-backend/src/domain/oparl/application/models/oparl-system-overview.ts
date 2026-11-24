import type { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import type {
  OparlSyncRun,
  OparlTypeCounts,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlBodySummary } from './oparl-body-summary';
import type { OparlDocumentStats } from './oparl-document';

export interface OparlSystemOverview {
  system: OparlSystem;
  bodies: OparlBodySummary[];
  /** Mirrored objects per type. */
  counts: OparlTypeCounts;
  /** The run in progress, if any. */
  running: OparlSyncRun | null;
  /** Where the files' text and the search index stand. */
  documents: OparlDocumentStats;
}

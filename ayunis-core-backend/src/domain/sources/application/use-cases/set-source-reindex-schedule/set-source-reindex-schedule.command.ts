import type { UUID } from 'crypto';
import type { ReindexInterval } from 'src/domain/sources/domain/reindex-interval';

export class SetSourceReindexScheduleCommand {
  readonly sourceId: UUID;
  /** Null stops automatic re-indexing. */
  readonly interval: ReindexInterval | null;

  constructor(params: { sourceId: UUID; interval: ReindexInterval | null }) {
    this.sourceId = params.sourceId;
    this.interval = params.interval;
  }
}

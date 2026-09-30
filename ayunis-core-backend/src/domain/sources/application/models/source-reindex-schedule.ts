import type { ReindexInterval } from 'src/domain/sources/domain/reindex-interval';

/** Both null when the source is not re-indexed automatically. */
export interface SourceReindexSchedule {
  interval: ReindexInterval | null;
  nextReindexAt: Date | null;
}

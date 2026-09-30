import type {
  DueSourceReindex,
  SourceSubtype,
} from 'src/domain/sources/application/models/due-source-reindex';

export enum SourceReindexOutcome {
  STARTED = 'started',
  /** The source cannot run now (gone, processing, failed); its next due date stands. */
  SKIPPED = 'skipped',
}

/**
 * Starts the scheduled re-index of one source type. A new schedulable type
 * adds a handler and registers it; the scheduler does not change. Throws
 * when the run could not be started for a reason worth retrying soon.
 */
export abstract class SourceReindexHandler {
  abstract readonly subtype: SourceSubtype;
  abstract start(due: DueSourceReindex): Promise<SourceReindexOutcome>;
}

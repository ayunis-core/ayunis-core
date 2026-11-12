import type { UUID } from 'crypto';

/**
 * Emitted once a source kept as a timed transcript (a meeting recording's
 * audio) has turned READY, by the process that transcribed it: the API or the
 * separate ingestion worker.
 */
export class TranscriptReadyEvent {
  static readonly EVENT_NAME = 'source.transcript-ready';

  constructor(
    public readonly sourceId: UUID,
    public readonly orgId: UUID,
  ) {}
}

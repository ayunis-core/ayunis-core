import type { UUID } from 'crypto';

export class PauseSyncedLocationCommand {
  constructor(
    public readonly params: {
      locationId: UUID;
      /** What the provider failed with. */
      error: unknown;
      /** The outage pauses the failed job took before. */
      pausesMade: number;
      /** The replacement the failed job was processing, if any. */
      processingSourceId?: UUID;
    },
  ) {}
}

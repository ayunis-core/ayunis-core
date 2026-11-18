import type { UUID } from 'crypto';

export class NextSyncedFileBatchQuery {
  constructor(
    public readonly locationId: UUID,
    /** The last file of the previous batch; `null` for the first. */
    public readonly afterFileId: UUID | null,
  ) {}
}

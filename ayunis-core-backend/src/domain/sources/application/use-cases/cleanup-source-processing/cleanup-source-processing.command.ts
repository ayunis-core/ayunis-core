import type { UUID } from 'crypto';

export class CleanupSourceProcessingCommand {
  constructor(
    public readonly sourceIds: UUID[],
    /** Null for a source whose org is no longer known; its processing prefix is then left alone. */
    public readonly orgId: UUID | null,
    /**
     * Storage keys of the deleted sources' uploaded originals. Each is
     * removed only when no remaining source still references it.
     */
    public readonly storageKeys: string[] = [],
  ) {}
}

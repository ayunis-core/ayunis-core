import type { UUID } from 'crypto';

export class CleanupSourceProcessingCommand {
  constructor(
    public readonly sourceIds: UUID[],
    public readonly orgId: UUID,
    /**
     * Storage keys of the deleted sources' uploaded originals. Each is
     * removed only when no remaining source still references it.
     */
    public readonly storageKeys: string[] = [],
  ) {}
}

import type { UUID } from 'crypto';

export class AddSyncedDocumentsToKnowledgeBaseCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    /** In the order they get the remaining room. */
    public readonly fileNames: string[],
    public readonly syncedLocationId: UUID,
  ) {}
}

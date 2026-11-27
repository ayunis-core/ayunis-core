import type { UUID } from 'crypto';
import type { ProcessingFileSourceToCreate } from 'src/domain/sources/application/use-cases/create-processing-file-sources/create-processing-file-sources.command';

export class AddSyncedDocumentsToKnowledgeBaseCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    /** In the order they get the remaining room. */
    public readonly documents: ProcessingFileSourceToCreate[],
    public readonly syncedLocationId: UUID,
  ) {}
}

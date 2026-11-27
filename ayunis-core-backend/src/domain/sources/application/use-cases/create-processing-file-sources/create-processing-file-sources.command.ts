import type { UUID } from 'crypto';

export interface ProcessingFileSourceToCreate {
  name: string;
  /**
   * The name its type is read from, when `name` does not tell it (a web
   * page's title); `null` to read it from `name`.
   */
  fileName: string | null;
  /** Where a citation opens it; `null` when citations open the stored file. */
  url: string | null;
}

export class CreateProcessingFileSourcesCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly files: ProcessingFileSourceToCreate[],
    public readonly syncedLocationId: UUID | null = null,
  ) {}
}

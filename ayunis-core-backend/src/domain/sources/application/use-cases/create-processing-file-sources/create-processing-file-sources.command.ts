import type { UUID } from 'crypto';

export class CreateProcessingFileSourcesCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly fileNames: string[],
  ) {}
}

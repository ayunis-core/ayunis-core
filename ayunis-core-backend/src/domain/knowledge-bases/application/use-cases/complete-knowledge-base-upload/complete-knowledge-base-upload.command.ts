import type { UUID } from 'crypto';

export class CompleteKnowledgeBaseUploadCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly uploadId: UUID,
  ) {}
}

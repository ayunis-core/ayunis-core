import type { UUID } from 'crypto';

export class DuplicateKnowledgeBaseDocumentsCommand {
  constructor(
    public readonly originKnowledgeBaseId: UUID,
    public readonly targetKnowledgeBaseId: UUID,
  ) {}
}

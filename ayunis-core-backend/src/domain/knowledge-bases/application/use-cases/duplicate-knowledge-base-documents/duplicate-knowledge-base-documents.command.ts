import type { UUID } from 'crypto';

export class DuplicateKnowledgeBaseDocumentsCommand {
  constructor(
    public readonly sourceKnowledgeBaseId: UUID,
    public readonly targetKnowledgeBaseId: UUID,
  ) {}
}

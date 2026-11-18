import type { UUID } from 'crypto';

export class RemoveFailedDocumentsFromKnowledgeBaseCommand {
  constructor(public readonly knowledgeBaseId: UUID) {}
}

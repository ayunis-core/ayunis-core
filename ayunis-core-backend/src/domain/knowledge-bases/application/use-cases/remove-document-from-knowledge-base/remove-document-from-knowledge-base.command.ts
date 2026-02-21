import type { UUID } from 'crypto';

export class RemoveDocumentFromKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly documentId: UUID;
  readonly userId: UUID;

  constructor(params: {
    knowledgeBaseId: UUID;
    documentId: UUID;
    userId: UUID;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.documentId = params.documentId;
    this.userId = params.userId;
  }
}

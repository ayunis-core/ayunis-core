import type { UUID } from 'crypto';

export class RemoveDocumentFromKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly documentId: UUID;

  constructor(params: { knowledgeBaseId: UUID; documentId: UUID }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.documentId = params.documentId;
  }
}

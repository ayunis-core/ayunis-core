import type { UUID } from 'crypto';

export class GetKnowledgeBaseDocumentTextQuery {
  knowledgeBaseId: UUID;
  documentId: UUID;
  orgId: UUID;
  userId: UUID;

  constructor(params: {
    knowledgeBaseId: UUID;
    documentId: UUID;
    orgId: UUID;
    userId: UUID;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.documentId = params.documentId;
    this.orgId = params.orgId;
    this.userId = params.userId;
  }
}

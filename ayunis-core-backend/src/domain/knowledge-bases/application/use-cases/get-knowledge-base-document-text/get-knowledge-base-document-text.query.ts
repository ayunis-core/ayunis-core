import type { UUID } from 'crypto';

export class GetKnowledgeBaseDocumentTextQuery {
  knowledgeBaseId: UUID;
  documentId: UUID;
  orgId: UUID;
  userId: UUID;

  readonly threadId?: UUID;

  constructor(params: {
    threadId?: UUID;
    knowledgeBaseId: UUID;
    documentId: UUID;
    orgId: UUID;
    userId: UUID;
  }) {
    this.threadId = params.threadId;
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.documentId = params.documentId;
    this.orgId = params.orgId;
    this.userId = params.userId;
  }
}

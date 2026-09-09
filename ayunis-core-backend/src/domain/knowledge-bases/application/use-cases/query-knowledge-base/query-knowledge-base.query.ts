import type { UUID } from 'crypto';

export class QueryKnowledgeBaseQuery {
  knowledgeBaseId: UUID;
  query: string;
  userId: UUID;

  readonly threadId?: UUID;

  constructor(params: {
    knowledgeBaseId: UUID;
    query: string;
    userId: UUID;
    threadId?: UUID;
  }) {
    this.threadId = params.threadId;
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.query = params.query;
    this.userId = params.userId;
  }
}

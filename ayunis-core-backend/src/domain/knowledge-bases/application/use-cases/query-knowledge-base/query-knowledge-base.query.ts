import type { UUID } from 'crypto';

export class QueryKnowledgeBaseQuery {
  knowledgeBaseIds: UUID[];
  queries: string[];
  userId: UUID;

  readonly threadId?: UUID;

  constructor(params: {
    knowledgeBaseIds: UUID[];
    queries: string[];
    userId: UUID;
    threadId?: UUID;
  }) {
    this.threadId = params.threadId;
    this.knowledgeBaseIds = params.knowledgeBaseIds;
    this.queries = params.queries;
    this.userId = params.userId;
  }
}

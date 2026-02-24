import type { UUID } from 'crypto';

export class QueryKnowledgeBaseQuery {
  knowledgeBaseId: UUID;
  query: string;
  userId: UUID;

  constructor(params: { knowledgeBaseId: UUID; query: string; userId: UUID }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.query = params.query;
    this.userId = params.userId;
  }
}

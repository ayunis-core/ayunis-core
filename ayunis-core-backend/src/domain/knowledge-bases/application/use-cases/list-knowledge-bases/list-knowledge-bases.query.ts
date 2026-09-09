import type { KnowledgeBaseOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export class ListKnowledgeBasesQuery {
  public readonly owner: KnowledgeBaseOwner;
  public readonly search?: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(params: {
    owner: KnowledgeBaseOwner;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    this.owner = params.owner;
    this.search = params.search?.trim() || undefined;
    this.limit = params.limit;
    this.offset = params.offset;
  }
}

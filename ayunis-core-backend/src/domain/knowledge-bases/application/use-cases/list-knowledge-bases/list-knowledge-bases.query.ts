import type { KnowledgeBaseListScope } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export class ListKnowledgeBasesQuery {
  public readonly owner: KnowledgeBaseListScope;
  public readonly search?: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(params: {
    owner: KnowledgeBaseListScope;
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

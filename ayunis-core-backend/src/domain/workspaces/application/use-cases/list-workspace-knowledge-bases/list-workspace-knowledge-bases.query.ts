import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';

export class ListWorkspaceKnowledgeBasesQuery extends PaginatedQuery {
  public readonly workspaceId: UUID;
  public readonly search?: string;

  constructor(params: {
    workspaceId: UUID;
    search?: string;
    limit: number;
    offset: number;
  }) {
    super({ limit: params.limit, offset: params.offset });
    this.workspaceId = params.workspaceId;
    this.search = params.search?.trim() || undefined;
  }
}

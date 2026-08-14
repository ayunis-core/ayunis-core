import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';

export class ListAccessibleSkillsQuery extends PaginatedQuery {
  public readonly search?: string;
  public readonly workspaceId?: UUID;

  constructor(params: {
    search?: string;
    workspaceId?: UUID;
    limit: number;
    offset: number;
  }) {
    super({ limit: params.limit, offset: params.offset });
    this.search = params.search?.trim() || undefined;
    this.workspaceId = params.workspaceId;
  }
}

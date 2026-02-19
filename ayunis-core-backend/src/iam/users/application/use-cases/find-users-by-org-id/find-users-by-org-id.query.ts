import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';

const DEFAULT_LIMIT = 25;

export interface FindUsersByOrgIdQueryParams {
  orgId: UUID;
  search?: string;
  pagination?: Partial<PaginatedQueryParams>;
}

export class FindUsersByOrgIdQuery extends PaginatedQuery {
  public readonly orgId: UUID;
  public readonly search?: string;

  constructor(params: FindUsersByOrgIdQueryParams) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.orgId = params.orgId;
    this.search = params.search;
  }
}

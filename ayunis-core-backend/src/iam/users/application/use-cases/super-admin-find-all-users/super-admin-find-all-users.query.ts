import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';

const DEFAULT_LIMIT = 25;

interface SuperAdminFindAllUsersQueryParams {
  search?: string;
  pagination?: Partial<PaginatedQueryParams>;
}

export class SuperAdminFindAllUsersQuery extends PaginatedQuery {
  public readonly search?: string;

  constructor(params: SuperAdminFindAllUsersQueryParams = {}) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.search = params.search;
  }
}

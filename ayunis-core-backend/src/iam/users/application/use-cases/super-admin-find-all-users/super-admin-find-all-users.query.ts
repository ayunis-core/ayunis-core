import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import { SortOrder } from 'src/common/sorting/sort';
import { SuperAdminUsersSortField } from 'src/iam/users/domain/value-objects/super-admin-users-sort.enum';

const DEFAULT_LIMIT = 25;

interface SuperAdminFindAllUsersQueryParams {
  search?: string;
  pagination?: Partial<PaginatedQueryParams>;
  sortBy?: SuperAdminUsersSortField;
  sortOrder?: SortOrder;
}

export class SuperAdminFindAllUsersQuery extends PaginatedQuery {
  public readonly search?: string;
  public readonly sortBy: SuperAdminUsersSortField;
  public readonly sortOrder: SortOrder;

  constructor(params: SuperAdminFindAllUsersQueryParams = {}) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.search = params.search;
    this.sortBy = params.sortBy ?? SuperAdminUsersSortField.CREATED_AT;
    this.sortOrder = params.sortOrder ?? SortOrder.DESC;
  }
}

import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import type { OrgLifecycleStatus } from 'src/iam/orgs/application/models/org-lifecycle-status';
import { SortOrder } from 'src/common/sorting/sort';
import { OrgsSortField } from 'src/iam/orgs/domain/orgs-sort-field.enum';

const DEFAULT_LIMIT = 50;

export interface SuperAdminGetAllOrgsQueryParams {
  search?: string;
  lifecycle?: OrgLifecycleStatus | 'all';
  pagination?: Partial<PaginatedQueryParams>;
  sortBy?: OrgsSortField;
  sortOrder?: SortOrder;
}

export class SuperAdminGetAllOrgsQuery extends PaginatedQuery {
  public readonly search?: string;
  public readonly lifecycle?: OrgLifecycleStatus | 'all';
  public readonly sortBy: OrgsSortField;
  public readonly sortOrder: SortOrder;

  constructor(params?: SuperAdminGetAllOrgsQueryParams) {
    super({
      limit: params?.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params?.pagination?.offset ?? 0,
    });
    this.search = params?.search;
    this.lifecycle = params?.lifecycle;
    this.sortBy = params?.sortBy ?? OrgsSortField.CREATED_AT;
    this.sortOrder = params?.sortOrder ?? SortOrder.DESC;
  }
}

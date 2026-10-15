import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import type { OrgLifecycleStatus } from 'src/iam/orgs/application/models/org-lifecycle-status';

const DEFAULT_LIMIT = 50;

export interface SuperAdminGetAllOrgsQueryParams {
  search?: string;
  lifecycle?: OrgLifecycleStatus | 'all';
  pagination?: Partial<PaginatedQueryParams>;
}

export class SuperAdminGetAllOrgsQuery extends PaginatedQuery {
  public readonly search?: string;
  public readonly lifecycle?: OrgLifecycleStatus | 'all';

  constructor(params?: SuperAdminGetAllOrgsQueryParams) {
    super({
      limit: params?.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params?.pagination?.offset ?? 0,
    });
    this.search = params?.search;
    this.lifecycle = params?.lifecycle;
  }
}

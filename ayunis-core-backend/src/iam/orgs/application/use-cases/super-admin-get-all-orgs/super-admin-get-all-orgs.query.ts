import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import type { OrgSubscriptionFilter } from 'src/iam/orgs/application/ports/orgs.repository';

const DEFAULT_LIMIT = 50;

export interface SuperAdminGetAllOrgsQueryParams {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  subscription?: OrgSubscriptionFilter;
  pagination?: Partial<PaginatedQueryParams>;
}

export class SuperAdminGetAllOrgsQuery extends PaginatedQuery {
  public readonly search?: string;
  public readonly status?: 'active' | 'archived' | 'all';
  public readonly subscription?: OrgSubscriptionFilter;

  constructor(params?: SuperAdminGetAllOrgsQueryParams) {
    super({
      limit: params?.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params?.pagination?.offset ?? 0,
    });
    this.search = params?.search;
    this.status = params?.status;
    this.subscription = params?.subscription;
  }
}

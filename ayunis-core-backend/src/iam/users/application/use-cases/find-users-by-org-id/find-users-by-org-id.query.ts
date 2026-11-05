import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import { SortOrder } from 'src/common/sorting/sort';
import { OrgUsersSortField } from 'src/iam/users/domain/value-objects/org-users-sort.enum';

const DEFAULT_LIMIT = 25;

export interface FindUsersByOrgIdQueryParams {
  orgId: UUID;
  search?: string;
  includeTeams?: boolean;
  pagination?: Partial<PaginatedQueryParams>;
  sortBy?: OrgUsersSortField;
  sortOrder?: SortOrder;
}

export class FindUsersByOrgIdQuery extends PaginatedQuery {
  public readonly orgId: UUID;
  public readonly search?: string;
  public readonly includeTeams: boolean;
  public readonly sortBy: OrgUsersSortField;
  public readonly sortOrder: SortOrder;

  constructor(params: FindUsersByOrgIdQueryParams) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.orgId = params.orgId;
    this.search = params.search;
    this.includeTeams = params.includeTeams ?? false;
    this.sortBy = params.sortBy ?? OrgUsersSortField.CREATED_AT;
    this.sortOrder = params.sortOrder ?? SortOrder.DESC;
  }
}

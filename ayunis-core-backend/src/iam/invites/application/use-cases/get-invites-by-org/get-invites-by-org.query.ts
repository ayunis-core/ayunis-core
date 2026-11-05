import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import { SortOrder } from 'src/common/sorting/sort';
import { InvitesSortField } from 'src/iam/invites/domain/invites-sort-field.enum';

const DEFAULT_LIMIT = 25;

export interface GetInvitesByOrgQueryParams {
  orgId: UUID;
  requestingUserId: UUID;
  onlyOpen?: boolean;
  search?: string;
  pagination?: Partial<PaginatedQueryParams>;
  sortBy?: InvitesSortField;
  sortOrder?: SortOrder;
}

export class GetInvitesByOrgQuery extends PaginatedQuery {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly onlyOpen: boolean;
  public readonly search?: string;
  public readonly sortBy: InvitesSortField;
  public readonly sortOrder: SortOrder;

  constructor(params: GetInvitesByOrgQueryParams) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.onlyOpen = params.onlyOpen ?? false;
    this.search = params.search;
    this.sortBy = params.sortBy ?? InvitesSortField.CREATED_AT;
    this.sortOrder = params.sortOrder ?? SortOrder.DESC;
  }
}

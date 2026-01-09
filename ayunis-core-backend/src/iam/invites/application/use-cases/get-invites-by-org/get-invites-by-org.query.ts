import { UUID } from 'crypto';
import {
  PaginatedQuery,
  PaginatedQueryParams,
} from 'src/common/pagination/paginated.query';

const DEFAULT_LIMIT = 25;

export interface GetInvitesByOrgQueryParams {
  orgId: UUID;
  requestingUserId: UUID;
  onlyOpen?: boolean;
  search?: string;
  pagination?: Partial<PaginatedQueryParams>;
}

export class GetInvitesByOrgQuery extends PaginatedQuery {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly onlyOpen: boolean;
  public readonly search?: string;

  constructor(params: GetInvitesByOrgQueryParams) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.onlyOpen = params.onlyOpen ?? false;
    this.search = params.search;
  }
}

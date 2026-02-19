// Utils
import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination';

// Static
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

export type UserUsageSortBy =
  | 'tokens'
  | 'requests'
  | 'lastActivity'
  | 'userName';
export type SortOrder = 'asc' | 'desc';

export class GetUserUsageQuery extends PaginatedQuery {
  public readonly organizationId: UUID;
  public readonly startDate?: Date;
  public readonly endDate?: Date;
  public readonly searchTerm?: string;
  public readonly sortBy: UserUsageSortBy;
  public readonly sortOrder: SortOrder;

  constructor(params: {
    organizationId: UUID;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    searchTerm?: string;
    sortBy?: UserUsageSortBy;
    sortOrder?: SortOrder;
  }) {
    super({
      limit: params.limit ?? UsageConstants.DEFAULT_USER_USAGE_LIMIT,
      offset: params.offset ?? 0,
    });
    this.organizationId = params.organizationId;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.searchTerm = params.searchTerm;
    this.sortBy = params.sortBy ?? 'tokens';
    this.sortOrder = params.sortOrder ?? 'desc';
  }
}

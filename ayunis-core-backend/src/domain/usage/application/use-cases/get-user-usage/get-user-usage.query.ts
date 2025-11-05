// Types
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';

// Utils
import { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination';

// Static
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

export type UserUsageSortBy =
  | 'tokens'
  | 'requests'
  | 'cost'
  | 'lastActivity'
  | 'userName';
export type SortOrder = 'asc' | 'desc';

export class GetUserUsageQuery extends PaginatedQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    pagination?: PaginatedQueryParams,
    public readonly searchTerm?: string,
    public readonly sortBy: UserUsageSortBy = 'tokens',
    public readonly sortOrder: SortOrder = 'desc',
    public readonly includeModelBreakdown: boolean = true,
  ) {
    super({
      limit: pagination?.limit ?? UsageConstants.DEFAULT_USER_USAGE_LIMIT,
      offset: pagination?.offset ?? 0,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { GetUserUsageQuery } from './get-user-usage.query';
import { UsageRepository, UserUsageItem } from '../../ports/usage.repository';
import { InvalidPaginationError } from '../../usage.errors';
import { validateOptionalDateRange } from '../../usage.utils';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class GetUserUsageUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetUserUsageQuery): Promise<Paginated<UserUsageItem>> {
    this.validateQuery(query);

    return this.usageRepository.getUserUsage(query);
  }

  private validateQuery(query: GetUserUsageQuery): void {
    // Validate date range if provided
    validateOptionalDateRange(query.startDate, query.endDate);

    // Validate pagination
    if (query.limit <= 0) {
      throw new InvalidPaginationError(
        'Pagination limit must be greater than 0',
      );
    }

    if (query.limit > UsageConstants.MAX_USER_USAGE_LIMIT) {
      throw new InvalidPaginationError(
        `Pagination limit cannot exceed ${UsageConstants.MAX_USER_USAGE_LIMIT}`,
      );
    }

    if (query.offset < 0) {
      throw new InvalidPaginationError('Pagination offset cannot be negative');
    }

    // Validate sort parameters
    const validSortFields: Array<typeof query.sortBy> = [
      'tokens',
      'requests',
      'lastActivity',
      'userName',
    ];
    if (!validSortFields.includes(query.sortBy)) {
      throw new InvalidPaginationError(`Invalid sort field: ${query.sortBy}`);
    }

    const validSortOrders: Array<typeof query.sortOrder> = ['asc', 'desc'];
    if (!validSortOrders.includes(query.sortOrder)) {
      throw new InvalidPaginationError(
        `Invalid sort order: ${query.sortOrder}`,
      );
    }
  }
}

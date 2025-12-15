import { Injectable } from '@nestjs/common';
import { GetUserUsageQuery } from './get-user-usage.query';
import { UsageRepository, UserUsageItem } from '../../ports/usage.repository';
import {
  InvalidDateRangeError,
  InvalidPaginationError,
} from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class GetUserUsageUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetUserUsageQuery): Promise<Paginated<UserUsageItem>> {
    this.validateQuery(query);

    const userUsageResult = await this.usageRepository.getUserUsage(query);

    return this.processUserUsageResult(userUsageResult);
  }

  private validateQuery(query: GetUserUsageQuery): void {
    // Validate date range if provided
    if (query.startDate && query.endDate) {
      if (query.startDate > query.endDate) {
        throw new InvalidDateRangeError('Start date cannot be after end date');
      }

      const now = new Date();
      if (query.startDate > now) {
        throw new InvalidDateRangeError('Start date cannot be in the future');
      }

      // Check if date range is reasonable (not more than 2 years)
      const maxDays = 730; // 2 years
      const daysDiff = Math.ceil(
        (query.endDate.getTime() - query.startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysDiff > maxDays) {
        throw new InvalidDateRangeError(
          `Date range cannot exceed ${maxDays} days`,
        );
      }
    }

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
      'cost',
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

  private processUserUsageResult(
    result: Paginated<UserUsageItem>,
  ): Paginated<UserUsageItem> {
    const now = new Date();
    const activeThresholdDate = new Date(
      now.getTime() -
        UsageConstants.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000,
    );

    // Process each user to determine activity status
    const processedUsers = result.data.map((user) => {
      // Determine if user is active based on last activity
      // Users with no activity (lastActivity === null) are considered inactive
      const isActive = user.lastActivity
        ? user.lastActivity >= activeThresholdDate
        : false;

      return {
        ...user,
        isActive,
      };
    });

    return new Paginated<UserUsageItem>({
      data: processedUsers,
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    });
  }
}

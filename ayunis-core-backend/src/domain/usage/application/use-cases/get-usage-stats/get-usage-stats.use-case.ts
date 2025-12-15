import { Injectable } from '@nestjs/common';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetUsageStatsUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    if (query.startDate && query.endDate) {
      this.validateDateRange(query.startDate, query.endDate);
    }

    const stats = await this.usageRepository.getUsageStats({
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return new UsageStats({
      totalTokens: Math.max(0, stats.totalTokens),
      totalRequests: Math.max(0, stats.totalRequests),
      activeUsers: Math.min(
        Math.max(0, stats.activeUsers),
        Math.max(0, stats.totalUsers),
      ),
      totalUsers: Math.max(0, stats.totalUsers),
      topModels: stats.topModels || [],
    });
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new InvalidDateRangeError('Start date cannot be after end date');
    }

    const now = new Date();
    if (startDate > now) {
      throw new InvalidDateRangeError('Start date cannot be in the future');
    }

    // Check if date range is reasonable (guard against heavy queries)
    const maxDays = UsageConstants.MAX_DATE_RANGE_DAYS;
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > maxDays) {
      throw new InvalidDateRangeError(
        `Date range cannot exceed ${maxDays} days`,
      );
    }
  }
}

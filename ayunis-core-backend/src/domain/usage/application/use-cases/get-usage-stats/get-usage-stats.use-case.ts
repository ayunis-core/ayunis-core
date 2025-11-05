import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetUsageStatsUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    const isSelfHosted = this.configService.get<boolean>(
      'app.isSelfHosted',
      false,
    );

    if (query.startDate && query.endDate) {
      this.validateDateRange(query.startDate, query.endDate);
    }

    const usageStats = await this.usageRepository.getUsageStats({
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return this.processUsageStats(usageStats, isSelfHosted);
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

  private processUsageStats(
    stats: UsageStats,
    isSelfHosted: boolean,
  ): UsageStats {
    return new UsageStats(
      Math.max(0, stats.totalTokens),
      Math.max(0, stats.totalRequests),
      isSelfHosted && stats.totalCost !== undefined
        ? Math.max(0, stats.totalCost)
        : undefined,
      stats.currency,
      Math.min(Math.max(0, stats.activeUsers), Math.max(0, stats.totalUsers)),
      Math.max(0, stats.totalUsers),
      stats.topModels || [],
    );
  }
}

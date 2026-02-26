import { Injectable } from '@nestjs/common';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { validateOptionalDateRange } from '../../usage.utils';

@Injectable()
export class GetUsageStatsUseCase {
  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    validateOptionalDateRange(query.startDate, query.endDate);

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
}

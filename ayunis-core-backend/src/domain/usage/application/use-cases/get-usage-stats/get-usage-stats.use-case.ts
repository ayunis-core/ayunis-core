import { Injectable, Logger } from '@nestjs/common';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { validateOptionalDateRange } from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetUsageStatsUseCase {
  private readonly logger = new Logger(GetUsageStatsUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log('Getting usage stats', {
      organizationId: query.organizationId,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });

    try {
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
        topModels: stats.topModels,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get usage stats', error);
      throw new UnexpectedUsageError(error as Error, {
        organizationId: query.organizationId,
      });
    }
  }
}

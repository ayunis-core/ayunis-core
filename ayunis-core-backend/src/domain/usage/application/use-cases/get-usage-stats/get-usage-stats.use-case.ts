import { Injectable, Logger } from '@nestjs/common';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UsageStats } from 'src/domain/usage/domain/usage-stats.entity';
import { validateOptionalDateRange } from 'src/domain/usage/application/usage.utils';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetUsageStatsUseCase {
  private readonly logger = new Logger(GetUsageStatsUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log(
      {
        organizationId: query.organizationId,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString(),
      },
      'Getting usage stats',
    );

    try {
      const stats = await this.usageRepository.getUsageStats({
        organizationId: query.organizationId,
        startDate: query.startDate,
        endDate: query.endDate,
      });

      return new UsageStats({
        totalCredits: Math.max(0, stats.totalCredits),
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
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get usage stats',
      );
      throw new UnexpectedUsageError(error as Error, {
        organizationId: query.organizationId,
      });
    }
  }
}

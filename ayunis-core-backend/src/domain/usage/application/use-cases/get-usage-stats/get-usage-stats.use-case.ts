import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageStats } from 'src/domain/usage/domain/usage-stats.entity';
import { validateOptionalDateRange } from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetUsageStatsUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetUsageStatsUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.info(
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

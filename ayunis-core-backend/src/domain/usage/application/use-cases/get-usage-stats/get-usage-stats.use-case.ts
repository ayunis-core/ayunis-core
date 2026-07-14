import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { validateOptionalDateRange } from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';

@Injectable()
export class GetUsageStatsUseCase {
  private readonly logger = new Logger(GetUsageStatsUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: GetUsageStatsQuery): Promise<UsageStats> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log('Getting usage stats', {
      organizationId: query.organizationId,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });

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
  }
}

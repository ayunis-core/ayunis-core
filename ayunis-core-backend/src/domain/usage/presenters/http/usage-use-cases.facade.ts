import { Injectable } from '@nestjs/common';
import { GetProviderUsageUseCase } from '../../application/use-cases/get-provider-usage/get-provider-usage.use-case';
import { GetModelDistributionUseCase } from '../../application/use-cases/get-model-distribution/get-model-distribution.use-case';
import { GetUserUsageUseCase } from '../../application/use-cases/get-user-usage/get-user-usage.use-case';
import { GetUsageStatsUseCase } from '../../application/use-cases/get-usage-stats/get-usage-stats.use-case';
import { GetProviderUsageQuery } from '../../application/use-cases/get-provider-usage/get-provider-usage.query';
import { GetModelDistributionQuery } from '../../application/use-cases/get-model-distribution/get-model-distribution.query';
import { GetUserUsageQuery } from '../../application/use-cases/get-user-usage/get-user-usage.query';
import { GetUsageStatsQuery } from '../../application/use-cases/get-usage-stats/get-usage-stats.query';
import { UsageStats } from '../../domain/usage-stats.entity';
import { ProviderUsage } from '../../domain/provider-usage.entity';
import { ModelDistribution } from '../../domain/model-distribution.entity';
import { UserUsageItem } from '../../domain/user-usage-item.entity';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class UsageUseCasesFacade {
  constructor(
    private readonly getProviderUsageUseCase: GetProviderUsageUseCase,
    private readonly getModelDistributionUseCase: GetModelDistributionUseCase,
    private readonly getUserUsageUseCase: GetUserUsageUseCase,
    private readonly getUsageStatsUseCase: GetUsageStatsUseCase,
  ) {}

  getProviderUsage(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    return this.getProviderUsageUseCase.execute(query);
  }

  getModelDistribution(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    return this.getModelDistributionUseCase.execute(query);
  }

  getUserUsage(query: GetUserUsageQuery): Promise<Paginated<UserUsageItem>> {
    return this.getUserUsageUseCase.execute(query);
  }

  getUsageStats(query: GetUsageStatsQuery): Promise<UsageStats> {
    return this.getUsageStatsUseCase.execute(query);
  }
}

import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { GetProviderUsageUseCase } from '../../application/use-cases/get-provider-usage/get-provider-usage.use-case';
import { GetModelDistributionUseCase } from '../../application/use-cases/get-model-distribution/get-model-distribution.use-case';
import { GetUserUsageUseCase } from '../../application/use-cases/get-user-usage/get-user-usage.use-case';
import { GetUsageStatsUseCase } from '../../application/use-cases/get-usage-stats/get-usage-stats.use-case';
import { GetCreditUsageUseCase } from '../../application/use-cases/get-credit-usage/get-credit-usage.use-case';
import { GetCreditUsageQuery } from '../../application/use-cases/get-credit-usage/get-credit-usage.query';
import { GetProviderUsageQuery } from '../../application/use-cases/get-provider-usage/get-provider-usage.query';
import { GetModelDistributionQuery } from '../../application/use-cases/get-model-distribution/get-model-distribution.query';
import { GetUserUsageQuery } from '../../application/use-cases/get-user-usage/get-user-usage.query';
import { GetUsageStatsQuery } from '../../application/use-cases/get-usage-stats/get-usage-stats.query';
import { UsageStats } from '../../domain/usage-stats.entity';
import { ProviderUsage } from '../../domain/provider-usage.entity';
import { ModelDistribution } from '../../domain/model-distribution.entity';
import type { UserUsageResult } from '../../application/ports/usage.repository';
import type { CreditUsage } from '../../domain/credit-usage';

@Injectable()
export class UsageUseCasesFacade {
  constructor(
    private readonly getProviderUsageUseCase: GetProviderUsageUseCase,
    private readonly getModelDistributionUseCase: GetModelDistributionUseCase,
    private readonly getUserUsageUseCase: GetUserUsageUseCase,
    private readonly getUsageStatsUseCase: GetUsageStatsUseCase,
    private readonly getCreditUsageUseCase: GetCreditUsageUseCase,
  ) {}

  getProviderUsage(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    return this.getProviderUsageUseCase.execute(query);
  }

  getModelDistribution(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    return this.getModelDistributionUseCase.execute(query);
  }

  getUserUsage(query: GetUserUsageQuery): Promise<UserUsageResult> {
    return this.getUserUsageUseCase.execute(query);
  }

  getUsageStats(query: GetUsageStatsQuery): Promise<UsageStats> {
    return this.getUsageStatsUseCase.execute(query);
  }

  getCreditUsage(orgId: UUID): Promise<CreditUsage> {
    return this.getCreditUsageUseCase.execute(new GetCreditUsageQuery(orgId));
  }
}

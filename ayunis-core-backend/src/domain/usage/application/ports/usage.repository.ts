import { UUID } from 'crypto';
import { Usage } from '../../domain/usage.entity';
import { GetUserUsageQuery } from '../use-cases/get-user-usage/get-user-usage.query';
import { GetProviderUsageQuery } from '../use-cases/get-provider-usage/get-provider-usage.query';
import { GetModelDistributionQuery } from '../use-cases/get-model-distribution/get-model-distribution.query';
import { GetGlobalProviderUsageQuery } from '../use-cases/get-global-provider-usage/get-global-provider-usage.query';
import { GetGlobalModelDistributionQuery } from '../use-cases/get-global-model-distribution/get-global-model-distribution.query';
import { GetUsageStatsQuery } from '../use-cases/get-usage-stats/get-usage-stats.query';
import { Paginated } from 'src/common/pagination';
import { UsageStats } from '../../domain/usage-stats.entity';
import { ProviderUsage } from '../../domain/provider-usage.entity';
import { TimeSeriesPoint } from '../../domain/time-series-point.entity';
import { ModelDistribution } from '../../domain/model-distribution.entity';
import { UserUsageItem } from '../../domain/user-usage-item.entity';
export {
  UsageStats,
  ProviderUsage,
  TimeSeriesPoint,
  ModelDistribution,
  UserUsageItem,
};

export abstract class UsageRepository {
  abstract save(usage: Usage): Promise<void>;
  abstract saveBatch(usages: Usage[]): Promise<void>;
  abstract findByOrganization(
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Usage[]>;
  abstract findByUser(
    userId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Usage[]>;
  abstract findByModel(
    modelId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Usage[]>;
  abstract getProviderUsage(
    query: GetProviderUsageQuery,
  ): Promise<ProviderUsage[]>;
  abstract getModelDistribution(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]>;
  abstract getUserUsage(
    query: GetUserUsageQuery,
  ): Promise<Paginated<UserUsageItem>>;
  abstract getUsageStats(query: GetUsageStatsQuery): Promise<UsageStats>;
  abstract getUsageCount(
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number>;

  abstract getGlobalProviderUsage(
    query: GetGlobalProviderUsageQuery,
  ): Promise<ProviderUsage[]>;

  abstract getGlobalModelDistribution(
    query: GetGlobalModelDistributionQuery,
  ): Promise<ModelDistribution[]>;
}

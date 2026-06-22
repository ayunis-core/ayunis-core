import type { UUID } from 'crypto';
import type { Usage } from '../../domain/usage.entity';
import type { GetUserUsageQuery } from '../use-cases/get-user-usage/get-user-usage.query';
import type { GetProviderUsageQuery } from '../use-cases/get-provider-usage/get-provider-usage.query';
import type { GetModelDistributionQuery } from '../use-cases/get-model-distribution/get-model-distribution.query';
import type { GetUsageStatsQuery } from '../use-cases/get-usage-stats/get-usage-stats.query';
import type { Paginated } from 'src/common/pagination';
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

export interface UserUsageResult {
  users: Paginated<UserUsageItem>;
  totalCredits: number;
}

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
  abstract getUserUsage(query: GetUserUsageQuery): Promise<UserUsageResult>;
  abstract getUsageStats(query: GetUsageStatsQuery): Promise<UsageStats>;
  abstract getUsageCount(
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number>;

  abstract getMonthlyCreditUsage(
    organizationId: UUID,
    monthStart: Date,
  ): Promise<number>;

  abstract getMonthlyCreditUsageForUser(
    organizationId: UUID,
    userId: UUID,
    monthStart: Date,
  ): Promise<number>;

  abstract getMonthlyCreditUsageForUsers(
    organizationId: UUID,
    userIds: UUID[],
    monthStart: Date,
  ): Promise<number>;
}

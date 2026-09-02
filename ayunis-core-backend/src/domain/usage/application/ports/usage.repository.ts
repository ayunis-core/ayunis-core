import type { UUID } from 'crypto';
import type { Usage } from 'src/domain/usage/domain/usage.entity';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { Paginated } from 'src/common/pagination';
import { UsageStats } from 'src/domain/usage/domain/usage-stats.entity';
import { ProviderUsage } from 'src/domain/usage/domain/provider-usage.entity';
import { TimeSeriesPoint } from 'src/domain/usage/domain/time-series-point.entity';
import { ModelDistribution } from 'src/domain/usage/domain/model-distribution.entity';
import { UserUsageItem } from 'src/domain/usage/domain/user-usage-item.entity';
export {
  UsageStats,
  ProviderUsage,
  TimeSeriesPoint,
  ModelDistribution,
  UserUsageItem,
};

interface UsageDateRangeParams {
  organizationId: UUID;
  startDate?: Date;
  endDate?: Date;
}

export interface ProviderUsageParams extends UsageDateRangeParams {
  includeTimeSeriesData: boolean;
  provider?: ModelProvider;
  modelId?: UUID;
}

export interface ModelDistributionParams extends UsageDateRangeParams {
  maxModels: number;
  modelId?: UUID;
}

export interface UserUsageParams extends UsageDateRangeParams {
  limit: number;
  offset: number;
  searchTerm?: string;
  sortBy: 'credits' | 'requests' | 'lastActivity' | 'userName';
  sortOrder: 'asc' | 'desc';
}

export type UsageStatsParams = UsageDateRangeParams;

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
  abstract existsByModelId(modelId: UUID): Promise<boolean>;
  abstract getProviderUsage(
    params: ProviderUsageParams,
  ): Promise<ProviderUsage[]>;
  abstract getModelDistribution(
    params: ModelDistributionParams,
  ): Promise<ModelDistribution[]>;
  abstract getUserUsage(params: UserUsageParams): Promise<UserUsageResult>;
  abstract getUsageStats(params: UsageStatsParams): Promise<UsageStats>;
  abstract getUsageCount(
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number>;

  abstract getMonthlyCreditUsage(
    organizationId: UUID,
    monthStart: Date,
  ): Promise<number>;

  abstract getTotalMonthlyCreditUsageForUser(
    organizationId: UUID,
    userId: UUID,
    monthStart: Date,
  ): Promise<number>;

  abstract getTotalMonthlyCreditUsageForUsers(
    organizationId: UUID,
    userIds: UUID[],
    monthStart: Date,
  ): Promise<number>;

  abstract getMonthlyCreditUsagePerUser(
    organizationId: UUID,
    userIds: UUID[],
    monthStart: Date,
  ): Promise<Map<UUID, number>>;

  abstract getTotalMonthlyCreditUsageForApiKey(
    organizationId: UUID,
    apiKeyId: UUID,
    monthStart: Date,
  ): Promise<number>;

  abstract getMonthlyCreditUsagePerApiKey(
    organizationId: UUID,
    apiKeyIds: UUID[],
    monthStart: Date,
  ): Promise<Map<UUID, number>>;
}

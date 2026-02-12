import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { Usage } from '../../../domain/usage.entity';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';
import {
  UsageRepository,
  ProviderUsage,
  ModelDistribution,
} from '../../../application/ports/usage.repository';
import { GetProviderUsageQuery } from '../../../application/use-cases/get-provider-usage/get-provider-usage.query';
import { GetModelDistributionQuery } from '../../../application/use-cases/get-model-distribution/get-model-distribution.query';
import { GetUserUsageQuery } from '../../../application/use-cases/get-user-usage/get-user-usage.query';
import { GetUsageStatsQuery } from '../../../application/use-cases/get-usage-stats/get-usage-stats.query';
import { Paginated } from 'src/common/pagination';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import { UsageRecord } from './schema/usage.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { UsageMapper } from './mappers/usage.mapper';
import { getProviderStats } from './queries/get-provider-stats.db-query';
import { getModelStats } from './queries/get-model-stats.db-query';
import { getTopModels } from './queries/get-top-models.db-query';
import { getProviderTimeSeries as queryProviderTimeSeries } from './queries/get-provider-time-series.db-query';
import { getGlobalProviderStats } from './queries/get-global-provider-stats.db-query';
import { getGlobalProviderTimeSeries } from './queries/get-global-provider-time-series.db-query';
import { getGlobalModelStats } from './queries/get-global-model-stats.db-query';
import { getUserUsageRows } from './queries/get-user-usage-rows.db-query';
import { countUsersForUserUsage } from './queries/count-users-for-user-usage.db-query';
import { findUsageRecordsByOrganization } from './queries/find-usage-records-by-organization.db-query';
import { findUsageRecordsByUser } from './queries/find-usage-records-by-user.db-query';
import { findUsageRecordsByModel } from './queries/find-usage-records-by-model.db-query';
import { getUsageAggregateStats } from './queries/get-usage-aggregate-stats.db-query';
import { countActiveUsersSince } from './queries/count-active-users-since.db-query';
import { countUsagesInRange } from './queries/count-usages-in-range.db-query';
import { UsageQueryMapper } from './mappers/usage-query.mapper';
import { GetGlobalProviderUsageQuery } from '../../../application/use-cases/get-global-provider-usage/get-global-provider-usage.query';
import { GetGlobalModelDistributionQuery } from '../../../application/use-cases/get-global-model-distribution/get-global-model-distribution.query';

@Injectable()
export class LocalUsageRepository extends UsageRepository {
  private readonly logger = new Logger(LocalUsageRepository.name);

  constructor(
    @InjectRepository(UsageRecord)
    private readonly usageRepository: Repository<UsageRecord>,
    @InjectRepository(UserRecord)
    private readonly userRepository: Repository<UserRecord>,
    private readonly usageMapper: UsageMapper,
    private readonly usageQueryMapper: UsageQueryMapper,
  ) {
    super();
  }

  async save(usage: Usage): Promise<void> {
    const record = this.usageMapper.toRecord(usage);
    await this.usageRepository.save(record);
  }

  async saveBatch(usages: Usage[]): Promise<void> {
    const records = usages.map((usage) => this.usageMapper.toRecord(usage));
    await this.usageRepository.save(records);
  }

  async findByOrganization(
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Usage[]> {
    const records = await findUsageRecordsByOrganization(
      this.usageRepository,
      organizationId,
      startDate,
      endDate,
    );
    return this.usageMapper.toDomainArray(records);
  }

  async findByUser(
    userId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Usage[]> {
    const records = await findUsageRecordsByUser(
      this.usageRepository,
      userId,
      startDate,
      endDate,
    );
    return this.usageMapper.toDomainArray(records);
  }

  async findByModel(
    modelId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Usage[]> {
    const records = await findUsageRecordsByModel(
      this.usageRepository,
      modelId,
      startDate,
      endDate,
    );
    return this.usageMapper.toDomainArray(records);
  }

  async getProviderUsage(
    query: GetProviderUsageQuery,
  ): Promise<ProviderUsage[]> {
    // Get aggregated provider usage
    const providerStats = await getProviderStats(
      this.usageRepository,
      query.organizationId,
      query.startDate,
      query.endDate,
      query.provider,
      query.modelId,
    );

    const totalTokens = providerStats.reduce(
      (sum, stat) => sum + parseInt(stat.tokens),
      0,
    );

    const results: ProviderUsage[] = [];
    for (const stat of providerStats) {
      const timeSeriesRows = query.includeTimeSeriesData
        ? await queryProviderTimeSeries(
            this.usageRepository,
            query.organizationId,
            String(stat.provider),
            query.startDate,
            query.endDate,
            query.modelId,
          )
        : [];
      const timeSeries =
        this.usageQueryMapper.mapTimeSeriesRows(timeSeriesRows);
      results.push(
        this.usageQueryMapper.mapProviderRow(stat, totalTokens, timeSeries),
      );
    }
    return results.sort((a, b) => b.tokens - a.tokens);
  }

  async getModelDistribution(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    const modelStats = await getModelStats(
      this.usageRepository,
      query.organizationId,
      query.startDate,
      query.endDate,
      query.modelId,
    );

    return this.usageQueryMapper.mapModelStatsToDistribution(modelStats).items;
  }

  async getUserUsage(
    query: GetUserUsageQuery,
  ): Promise<Paginated<UserUsageItem>> {
    // Determine sort field and order
    const sortField = this.mapSortFieldForUsers(query.sortBy || 'tokens');
    const sortOrder = (query.sortOrder || 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    // Fetch total count for pagination and rows via query helpers
    const [total, userStats] = await Promise.all([
      countUsersForUserUsage({
        userRepository: this.userRepository,
        organizationId: query.organizationId,
        startDate: query.startDate,
        endDate: query.endDate,
        searchTerm: query.searchTerm,
      }),

      getUserUsageRows({
        userRepository: this.userRepository,
        organizationId: query.organizationId,
        startDate: query.startDate,
        endDate: query.endDate,
        searchTerm: query.searchTerm,
        sortField,
        sortOrder,
        offset: query.offset,
        limit: query.limit,
      }),
    ]);

    const users: UserUsageItem[] = [];

    for (const stat of userStats) {
      const tokens = stat.tokens ? parseInt(stat.tokens) : 0;
      const requests = parseInt(stat.requests || '0');
      // For users with no usage, lastActivity should be null
      const lastActivity = stat.lastActivity
        ? new Date(stat.lastActivity)
        : null;

      users.push(
        new UserUsageItem({
          userId: stat.userId as unknown as UUID,
          userName: stat.userName || '',
          userEmail: stat.userEmail || '',
          tokens,
          requests,
          lastActivity,
          isActive: this.isUserActive(lastActivity),
        }),
      );
    }

    return new Paginated<UserUsageItem>({
      data: users,
      limit: query.limit,
      offset: query.offset,
      total,
    });
  }

  async getUsageStats(query: GetUsageStatsQuery): Promise<UsageStats> {
    const stats = (await getUsageAggregateStats(
      this.usageRepository,
      query.organizationId,
      query.startDate,
      query.endDate,
    )) ?? {
      totalTokens: '0',
      totalRequests: '0',
      totalUsers: '0',
    };

    // Get active users (users with activity within the configured threshold)
    const activeThresholdDate = this.getActiveThresholdDate();
    const activeUsers = await countActiveUsersSince(
      this.usageRepository,
      query.organizationId,
      activeThresholdDate,
    );

    // Get top models
    const topModelsResult = await getTopModels(
      this.usageRepository,
      query.organizationId,
      query.startDate,
      query.endDate,
      5,
    );

    const topModels = this.usageQueryMapper.mapTopModelRows(topModelsResult);

    return new UsageStats({
      totalTokens: (stats.totalTokens ? parseInt(stats.totalTokens) : 0) || 0,
      totalRequests: parseInt(stats.totalRequests) || 0,
      activeUsers,
      totalUsers: parseInt(stats.totalUsers) || 0,
      topModels,
    });
  }

  async getUsageCount(
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    return await countUsagesInRange(
      this.usageRepository,
      organizationId,
      startDate,
      endDate,
    );
  }

  async getGlobalProviderUsage(
    query: GetGlobalProviderUsageQuery,
  ): Promise<ProviderUsage[]> {
    const providerStats = await getGlobalProviderStats(
      this.usageRepository,
      query.startDate,
      query.endDate,
      query.provider,
      query.modelId,
    );

    const totalTokens = providerStats.reduce(
      (sum, stat) => sum + parseInt(stat.tokens),
      0,
    );

    const results: ProviderUsage[] = [];
    for (const stat of providerStats) {
      const timeSeriesRows = query.includeTimeSeriesData
        ? await getGlobalProviderTimeSeries(
            this.usageRepository,
            String(stat.provider),
            query.startDate,
            query.endDate,
            query.modelId,
          )
        : [];
      const timeSeries =
        this.usageQueryMapper.mapTimeSeriesRows(timeSeriesRows);
      results.push(
        this.usageQueryMapper.mapProviderRow(stat, totalTokens, timeSeries),
      );
    }
    return results.sort((a, b) => b.tokens - a.tokens);
  }

  async getGlobalModelDistribution(
    query: GetGlobalModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    const modelStats = await getGlobalModelStats(
      this.usageRepository,
      query.startDate,
      query.endDate,
      query.modelId,
    );

    return this.usageQueryMapper.mapModelStatsToDistribution(modelStats).items;
  }

  private getActiveThresholdDate(): Date {
    return new Date(
      Date.now() -
        UsageConstants.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000,
    );
  }

  private mapSortFieldForUsers(sortBy: string): string {
    switch (sortBy) {
      case 'tokens':
        return 'COALESCE(SUM(usage.totalTokens), 0)';
      case 'requests':
        return 'COUNT(usage.id)';
      case 'lastActivity':
        return 'MAX(usage.createdAt)';
      case 'userName':
        return 'user.name';
      default:
        return 'COALESCE(SUM(usage.totalTokens), 0)';
    }
  }

  private isUserActive(lastActivity: Date | null): boolean {
    if (!lastActivity) {
      return false; // Users with no activity are considered inactive
    }
    const activeThresholdDate = this.getActiveThresholdDate();
    return lastActivity >= activeThresholdDate;
  }
}

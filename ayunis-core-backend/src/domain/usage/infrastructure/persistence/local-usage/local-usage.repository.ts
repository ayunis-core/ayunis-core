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
import { GetGlobalUserUsageQuery } from '../../../application/use-cases/get-global-user-usage/get-global-user-usage.query';
import { GlobalUserUsageItem } from '../../../domain/global-user-usage-item.entity';
import { getGlobalUserUsageRows } from './queries/get-global-user-usage-rows.db-query';

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
      (sum, stat) => sum + parseInt(stat.tokens, 10),
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

    const users = userStats.map((stat) => {
      const { tokens, requests, lastActivity } = this.mapUsageRow(stat);

      return new UserUsageItem({
        userId: stat.userId as unknown as UUID,
        userName: stat.userName || '',
        userEmail: stat.userEmail || '',
        tokens,
        requests,
        lastActivity,
        isActive: UserUsageItem.computeIsActive(lastActivity),
      });
    });

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
    const activeThresholdDate = UserUsageItem.getActiveThresholdDate();
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
      totalTokens:
        (stats.totalTokens ? parseInt(stats.totalTokens, 10) : 0) || 0,
      totalRequests: parseInt(stats.totalRequests, 10) || 0,
      activeUsers,
      totalUsers: parseInt(stats.totalUsers, 10) || 0,
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
      (sum, stat) => sum + parseInt(stat.tokens, 10),
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

  async getGlobalUserUsage(
    query: GetGlobalUserUsageQuery,
  ): Promise<GlobalUserUsageItem[]> {
    const rows = await getGlobalUserUsageRows({
      usageRepository: this.usageRepository,
      userRepository: this.userRepository,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: UsageConstants.GLOBAL_USER_USAGE_LIMIT,
    });

    return rows.map((row) => {
      const { tokens, requests, lastActivity } = this.mapUsageRow(row);

      return new GlobalUserUsageItem({
        userId: row.userId as unknown as UUID,
        userName: row.userName || '',
        userEmail: row.userEmail || '',
        tokens,
        requests,
        lastActivity,
        isActive: UserUsageItem.computeIsActive(lastActivity),
        organizationName: row.organizationName || '',
      });
    });
  }

  private mapUsageRow(row: {
    tokens?: string | null;
    requests?: string | null;
    lastActivity?: Date | string | null;
  }): { tokens: number; requests: number; lastActivity: Date | null } {
    return {
      tokens: row.tokens ? parseInt(row.tokens, 10) : 0,
      requests: row.requests ? parseInt(row.requests, 10) : 0,
      lastActivity: row.lastActivity ? new Date(row.lastActivity) : null,
    };
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
}

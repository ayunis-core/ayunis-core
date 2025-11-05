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
import { ModelBreakdownItem } from '../../../domain/model-breakdown-item.entity';
import { UsageRecord } from './schema/usage.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { UsageMapper } from './mappers/usage.mapper';
import {
  getProviderStats,
  getModelStats,
  getTopModels,
  getProviderTimeSeries as queryProviderTimeSeries,
  getUserModelStats,
  getUserUsageRows,
  countUsersForUserUsage,
  findUsageRecordsByOrganization,
  findUsageRecordsByUser,
  findUsageRecordsByModel,
  getUsageAggregateStats,
  countActiveUsersSince,
  deleteUsagesOlderThan,
  countUsagesInRange,
} from './queries/usage.queries';
import {
  mapProviderRow,
  mapTimeSeriesRows,
  mapModelStatsToDistribution,
  mapTopModelRows,
  mapUserModelStatsToBreakdown,
} from './mappers/usage-query.mapper';

@Injectable()
export class LocalUsageRepository extends UsageRepository {
  private readonly logger = new Logger(LocalUsageRepository.name);

  constructor(
    @InjectRepository(UsageRecord)
    private readonly usageRepository: Repository<UsageRecord>,
    @InjectRepository(UserRecord)
    private readonly userRepository: Repository<UserRecord>,
    private readonly usageMapper: UsageMapper,
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
      const timeSeries = mapTimeSeriesRows(timeSeriesRows);
      results.push(mapProviderRow(stat, totalTokens, timeSeries));
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

    return mapModelStatsToDistribution(modelStats).items;
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
      const cost = stat.cost ? parseFloat(stat.cost) : undefined;
      // For users with no usage, lastActivity should be null
      const lastActivity = stat.lastActivity
        ? new Date(stat.lastActivity)
        : null;

      let modelBreakdown: ModelBreakdownItem[] = [];

      if (query.includeModelBreakdown && requests > 0) {
        modelBreakdown = await this.getUserModelBreakdown(
          stat.userId as unknown as UUID,
          query.organizationId,
          query.startDate,
          query.endDate,
        );

        // Validate that breakdown sum matches total tokens
        const breakdownTokens = modelBreakdown.reduce(
          (sum, model) => sum + model.tokens,
          0,
        );
        const breakdownRequests = modelBreakdown.reduce(
          (sum, model) => sum + model.requests,
          0,
        );

        // Log warning if breakdown doesn't match totals (indicates data integrity issue)
        if (breakdownTokens !== tokens || breakdownRequests !== requests) {
          const missingTokens = tokens - breakdownTokens;
          const missingRequests = requests - breakdownRequests;
          const breakdownPercentage =
            tokens > 0 ? ((breakdownTokens / tokens) * 100).toFixed(2) : '0.00';

          this.logger.warn(
            `User usage breakdown mismatch for userId: ${stat.userId}`,
            {
              userId: stat.userId,
              userName: stat.userName,
              totalTokens: tokens,
              totalRequests: requests,
              breakdownTokens,
              breakdownRequests,
              breakdownModelCount: modelBreakdown.length,
              missingTokens,
              missingRequests,
              breakdownPercentage: `${breakdownPercentage}%`,
            },
          );
        }
      }

      users.push(
        new UserUsageItem(
          stat.userId as unknown as UUID,
          stat.userName || '',
          stat.userEmail || '',
          tokens,
          requests,
          requests > 0 ? cost : undefined,
          lastActivity,
          this.isUserActive(lastActivity),
          modelBreakdown,
        ),
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
      totalCost: null,
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

    const topModels = mapTopModelRows(topModelsResult);

    return new UsageStats(
      (stats.totalTokens ? parseInt(stats.totalTokens) : 0) || 0,
      parseInt(stats.totalRequests) || 0,
      stats.totalCost ? parseFloat(stats.totalCost) : undefined,
      stats.totalCost ? UsageConstants.DEFAULT_CURRENCY : undefined,
      activeUsers,
      parseInt(stats.totalUsers) || 0,
      topModels,
    );
  }

  async deleteOlderThan(date: Date): Promise<number> {
    return await deleteUsagesOlderThan(this.usageRepository, date);
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

  private async getUserModelBreakdown(
    userId: UUID,
    organizationId: UUID,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ModelBreakdownItem[]> {
    const modelStats = await getUserModelStats(
      this.usageRepository,
      userId,
      organizationId,
      startDate,
      endDate,
    );

    const breakdown = mapUserModelStatsToBreakdown(modelStats);
    return breakdown;
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
      case 'cost':
        return 'COALESCE(SUM(usage.cost), 0)';
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

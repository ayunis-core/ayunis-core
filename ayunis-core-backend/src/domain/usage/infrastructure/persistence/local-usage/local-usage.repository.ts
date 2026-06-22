import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { Usage } from '../../../domain/usage.entity';
import {
  UsageRepository,
  ProviderUsage,
  ModelDistribution,
  type UserUsageResult,
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
import { getUserUsageRows } from './queries/get-user-usage-rows.db-query';
import { countUsersForUserUsage } from './queries/count-users-for-user-usage.db-query';
import { sumCreditsForOrg } from './queries/sum-credits-for-org.db-query';
import { findUsageRecordsByOrganization } from './queries/find-usage-records-by-organization.db-query';
import { findUsageRecordsByUser } from './queries/find-usage-records-by-user.db-query';
import { findUsageRecordsByModel } from './queries/find-usage-records-by-model.db-query';
import { getUsageAggregateStats } from './queries/get-usage-aggregate-stats.db-query';
import { countActiveUsersSince } from './queries/count-active-users-since.db-query';
import { countUsagesInRange } from './queries/count-usages-in-range.db-query';
import { UsageQueryMapper } from './mappers/usage-query.mapper';

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
    const providerStats = await getProviderStats({
      usageRepository: this.usageRepository,
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
      provider: query.provider,
      modelId: query.modelId,
    });

    const totalCredits = providerStats.reduce(
      (sum, stat) => sum + (Number(stat.credits) || 0),
      0,
    );

    const results: ProviderUsage[] = [];
    for (const stat of providerStats) {
      const timeSeriesRows = query.includeTimeSeriesData
        ? await queryProviderTimeSeries({
            usageRepository: this.usageRepository,
            organizationId: query.organizationId,
            provider: String(stat.provider),
            startDate: query.startDate,
            endDate: query.endDate,
            modelId: query.modelId,
          })
        : [];
      const timeSeries =
        this.usageQueryMapper.mapTimeSeriesRows(timeSeriesRows);
      results.push(
        this.usageQueryMapper.mapProviderRow(stat, totalCredits, timeSeries),
      );
    }
    return results.sort((a, b) => b.credits - a.credits);
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

  async getUserUsage(query: GetUserUsageQuery): Promise<UserUsageResult> {
    // Determine sort field and order
    const sortField = this.mapSortFieldForUsers(query.sortBy);
    const sortOrder = query.sortOrder.toUpperCase() as 'ASC' | 'DESC';

    // Fetch total count, credit sum, and rows in parallel
    const [total, totalCredits, userStats] = await Promise.all([
      countUsersForUserUsage({
        userRepository: this.userRepository,
        organizationId: query.organizationId,
        startDate: query.startDate,
        endDate: query.endDate,
        searchTerm: query.searchTerm,
      }),

      sumCreditsForOrg(
        this.usageRepository,
        query.organizationId,
        query.startDate,
        query.endDate,
      ),

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

    return {
      users: new Paginated<UserUsageItem>({
        data: this.mapUserStatsToItems(userStats),
        limit: query.limit,
        offset: query.offset,
        total,
      }),
      totalCredits,
    };
  }

  private mapUserStatsToItems(
    userStats: Array<{
      userId: unknown;
      userName?: string | null;
      userEmail?: string | null;
      credits?: string | null;
      requests?: string | null;
      lastActivity?: Date | string | null;
    }>,
  ): UserUsageItem[] {
    return userStats.map((stat) => {
      const { credits, requests, lastActivity } = this.mapUsageRow(stat);

      return new UserUsageItem({
        userId: stat.userId as UUID,
        userName: stat.userName ?? '',
        userEmail: stat.userEmail ?? '',
        credits,
        requests,
        lastActivity,
        isActive: UserUsageItem.computeIsActive(lastActivity),
      });
    });
  }

  async getUsageStats(query: GetUsageStatsQuery): Promise<UsageStats> {
    const stats = (await getUsageAggregateStats(
      this.usageRepository,
      query.organizationId,
      query.startDate,
      query.endDate,
    )) ?? {
      totalCredits: '0',
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
      totalCredits: (stats.totalCredits ? Number(stats.totalCredits) : 0) || 0,
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

  async getMonthlyCreditUsage(
    organizationId: UUID,
    monthStart: Date,
  ): Promise<number> {
    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('COALESCE(SUM(usage.creditsConsumed), 0)', 'total')
      .where('usage.organizationId = :organizationId', { organizationId })
      .andWhere('usage.createdAt >= :monthStart', { monthStart })
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getTotalMonthlyCreditUsageForUser(
    userId: UUID,
    monthStart: Date,
  ): Promise<number> {
    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('COALESCE(SUM(usage.creditsConsumed), 0)', 'total')
      .where('usage.userId = :userId', { userId })
      .andWhere('usage.createdAt >= :monthStart', { monthStart })
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getTotalMonthlyCreditUsageForUsers(
    userIds: UUID[],
    monthStart: Date,
  ): Promise<number> {
    if (userIds.length === 0) {
      return 0;
    }

    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('COALESCE(SUM(usage.creditsConsumed), 0)', 'total')
      .where('usage.userId IN (:...userIds)', { userIds })
      .andWhere('usage.createdAt >= :monthStart', { monthStart })
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0') || 0;
  }

  async getMonthlyCreditUsagePerUser(
    userIds: UUID[],
    monthStart: Date,
  ): Promise<Map<UUID, number>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.usageRepository
      .createQueryBuilder('usage')
      .select('usage.userId', 'userId')
      .addSelect('COALESCE(SUM(usage.creditsConsumed), 0)', 'total')
      .where('usage.userId IN (:...userIds)', { userIds })
      .andWhere('usage.createdAt >= :monthStart', { monthStart })
      .groupBy('usage.userId')
      .getRawMany<{ userId: UUID; total: string }>();

    return new Map(rows.map((row) => [row.userId, parseFloat(row.total) || 0]));
  }

  private mapUsageRow(row: {
    credits?: string | null;
    requests?: string | null;
    lastActivity?: Date | string | null;
  }): { credits: number; requests: number; lastActivity: Date | null } {
    return {
      credits: row.credits ? Math.round(parseFloat(row.credits)) : 0,
      requests: row.requests ? parseInt(row.requests, 10) : 0,
      lastActivity: row.lastActivity ? new Date(row.lastActivity) : null,
    };
  }

  private mapSortFieldForUsers(sortBy: string): string {
    switch (sortBy) {
      case 'credits':
        return 'COALESCE(SUM(usage.creditsConsumed), 0)';
      case 'requests':
        return 'COUNT(usage.id)';
      case 'lastActivity':
        return 'MAX(usage.createdAt)';
      case 'userName':
        return 'user.name';
      default:
        return 'COALESCE(SUM(usage.creditsConsumed), 0)';
    }
  }
}

import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

export interface ProviderStatsRow {
  provider: ModelProvider | string;
  tokens: string; // numeric aggregates come back as strings
  requests: string;
  cost: string | null;
}
export interface ModelStatsRow {
  modelId: UUID;
  provider: ModelProvider;
  modelName: string | null;
  displayName: string | null;
  tokens: string;
  requests: string;
  cost: string | null;
}
export interface TopModelRow {
  modelId: UUID;
  displayName: string | null;
  tokens: string;
}

export interface TimeSeriesRow {
  date: string | Date;
  tokens: string;
  requests: string;
  cost: string | null;
}

export interface UsageAggregateRow {
  totalTokens: string | null;
  totalRequests: string;
  totalCost: string | null;
  totalUsers: string;
}

export interface UserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  tokens: string | null;
  requests: string;
  cost: string | null;
  lastActivity: Date | null;
}

export interface GetUserUsageQueryParams {
  userRepository: Repository<UserRecord>;
  organizationId: UUID;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  sortField: string; // pre-mapped sort field expression
  sortOrder: 'ASC' | 'DESC';
  offset: number;
  limit: number;
}

export async function getProviderStats(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
  provider?: string,
  modelId?: UUID,
): Promise<ProviderStatsRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('usage.provider', 'provider')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }
  if (provider) {
    qb.andWhere('usage.provider = :provider', { provider });
  }
  if (modelId) {
    qb.andWhere('usage.modelId = :modelId', { modelId });
  }

  return await qb.groupBy('usage.provider').getRawMany<ProviderStatsRow>();
}

export async function getModelStats(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
  modelId?: UUID,
): Promise<ModelStatsRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .leftJoin(
      ModelRecord,
      'model',
      'CAST(model.id AS uuid) = CAST(usage.modelId AS uuid)',
    )
    .select('usage.modelId', 'modelId')
    .addSelect('usage.provider', 'provider')
    .addSelect('model.name', 'modelName')
    .addSelect('model.displayName', 'displayName')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }
  if (modelId) {
    qb.andWhere('usage.modelId = :modelId', { modelId });
  }

  return await qb
    .groupBy('usage.modelId, usage.provider, model.name, model.displayName')
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .getRawMany<ModelStatsRow>();
}

export async function getTopModels(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
  limit: number = 5,
): Promise<TopModelRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .leftJoin(
      ModelRecord,
      'model',
      'CAST(model.id AS uuid) = CAST(usage.modelId AS uuid)',
    )
    .select('usage.modelId', 'modelId')
    .addSelect('model.displayName', 'displayName')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb
    .groupBy('usage.modelId, model.displayName')
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .limit(limit)
    .getRawMany<TopModelRow>();
}

export async function getProviderTimeSeries(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  provider: string,
  startDate?: Date,
  endDate?: Date,
  modelId?: UUID,
): Promise<TimeSeriesRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('DATE(usage.createdAt)', 'date')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .where('usage.organizationId = :orgId', { orgId: organizationId })
    .andWhere('usage.provider = :provider', { provider });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }
  if (modelId) {
    qb.andWhere('usage.modelId = :modelId', { modelId });
  }

  return await qb
    .groupBy('DATE(usage.createdAt)')
    .orderBy('DATE(usage.createdAt)', 'ASC')
    .getRawMany<TimeSeriesRow>();
}

export async function getUserModelStats(
  usageRepository: Repository<UsageRecord>,
  userId: UUID,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<ModelStatsRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .leftJoin(
      ModelRecord,
      'model',
      'CAST(model.id AS uuid) = CAST(usage.modelId AS uuid)',
    )
    .select('usage.modelId', 'modelId')
    .addSelect('usage.provider', 'provider')
    .addSelect(
      'COALESCE(model.name, CONCAT(\'model-\', LEFT("usage"."modelId"::text, 8)))',
      'modelName',
    )
    .addSelect(
      'COALESCE(model.displayName, CONCAT(\'Model \', LEFT("usage"."modelId"::text, 8)))',
      'displayName',
    )
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .where('usage.userId = :userId', { userId })
    .andWhere('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb
    .groupBy('usage.modelId')
    .addGroupBy('usage.provider')
    .addGroupBy(
      'COALESCE(model.name, CONCAT(\'model-\', LEFT("usage"."modelId"::text, 8)))',
    )
    .addGroupBy(
      'COALESCE(model.displayName, CONCAT(\'Model \', LEFT("usage"."modelId"::text, 8)))',
    )
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .getRawMany<ModelStatsRow>();
}

export async function getUserUsageRows(
  params: GetUserUsageQueryParams,
): Promise<UserUsageRow[]> {
  // Use subquery to aggregate usage separately to avoid Cartesian product
  // when joining with usageAll for lastActivity
  const usageSubquery = params.userRepository.manager
    .createQueryBuilder()
    .select('usage.userId', 'userId')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(usage.id)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .from(UsageRecord, 'usage')
    .where('CAST(usage.organizationId AS uuid) = CAST(:orgId AS uuid)', {
      orgId: params.organizationId.toString(),
    })
    .groupBy('usage.userId');

  if (params.startDate) {
    usageSubquery.andWhere('usage.createdAt >= :startDate', {
      startDate: params.startDate,
    });
  }
  if (params.endDate) {
    usageSubquery.andWhere('usage.createdAt <= :endDate', {
      endDate: params.endDate,
    });
  }

  // Subquery for lastActivity to avoid Cartesian product
  const lastActivitySubquery = params.userRepository.manager
    .createQueryBuilder()
    .select('usageAll.userId', 'userId')
    .addSelect('MAX(usageAll.createdAt)', 'lastActivity')
    .from(UsageRecord, 'usageAll')
    .where('CAST(usageAll.organizationId AS uuid) = CAST(:orgId AS uuid)', {
      orgId: params.organizationId.toString(),
    })
    .groupBy('usageAll.userId');

  const qb = params.userRepository
    .createQueryBuilder('user')
    .leftJoin(
      `(${usageSubquery.getQuery()})`,
      'usageagg',
      'CAST("usageagg"."userId" AS uuid) = CAST("user"."id" AS uuid)',
    )
    .leftJoin(
      `(${lastActivitySubquery.getQuery()})`,
      'lastactivityagg',
      'CAST("lastactivityagg"."userId" AS uuid) = CAST("user"."id" AS uuid)',
    )
    .select('user.id', 'userId')
    .addSelect('user.name', 'userName')
    .addSelect('user.email', 'userEmail')
    .addSelect('COALESCE("usageagg"."tokens", 0)', 'tokens')
    .addSelect('COALESCE("usageagg"."requests", 0)', 'requests')
    .addSelect('COALESCE("usageagg"."cost", 0)', 'cost')
    .addSelect('"lastactivityagg"."lastActivity"', 'lastActivity')
    .where('CAST(user.orgId AS uuid) = CAST(:orgId AS uuid)', {
      orgId: params.organizationId.toString(),
    })
    .groupBy('user.id')
    .addGroupBy('user.name')
    .addGroupBy('user.email')
    .addGroupBy('"usageagg"."tokens"')
    .addGroupBy('"usageagg"."requests"')
    .addGroupBy('"usageagg"."cost"')
    .addGroupBy('"lastactivityagg"."lastActivity"');

  // Set parameters from subqueries
  const allParameters = {
    ...usageSubquery.getParameters(),
    ...lastActivitySubquery.getParameters(),
  };
  qb.setParameters(allParameters);

  if (params.searchTerm) {
    qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
      search: `%${params.searchTerm}%`,
    });
  }

  // Map sortField to use the correct column reference
  let orderByField = params.sortField;
  if (
    params.sortField === 'COALESCE(SUM(usage.totalTokens), 0)' ||
    params.sortField.includes('usage.totalTokens')
  ) {
    orderByField = 'COALESCE("usageagg"."tokens", 0)';
  } else if (
    params.sortField === 'COALESCE(SUM(usage.cost), 0)' ||
    params.sortField.includes('usage.cost')
  ) {
    orderByField = 'COALESCE("usageagg"."cost", 0)';
  } else if (
    params.sortField === 'COUNT(usage.id)' ||
    params.sortField.includes('usage.id')
  ) {
    orderByField = 'COALESCE("usageagg"."requests", 0)';
  } else if (
    params.sortField === 'MAX(usageAll.createdAt)' ||
    params.sortField === 'MAX(usage.createdAt)' ||
    params.sortField.includes('usageAll.createdAt') ||
    params.sortField.includes('usage.createdAt')
  ) {
    orderByField = '"lastactivityagg"."lastActivity"';
  }

  qb.orderBy(orderByField, params.sortOrder);
  qb.addOrderBy('user.name', 'ASC');

  return await qb
    .offset(params.offset)
    .limit(params.limit)
    .getRawMany<UserUsageRow>();
}

export async function countUsersForUserUsage(
  params: Omit<
    GetUserUsageQueryParams,
    'offset' | 'limit' | 'sortField' | 'sortOrder'
  >,
): Promise<number> {
  // Use subquery to aggregate usage separately to avoid Cartesian product
  const usageSubquery = params.userRepository.manager
    .createQueryBuilder()
    .select('usage.userId', 'userId')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(usage.id)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .from(UsageRecord, 'usage')
    .where('CAST(usage.organizationId AS uuid) = CAST(:orgId AS uuid)', {
      orgId: params.organizationId.toString(),
    })
    .groupBy('usage.userId');

  if (params.startDate) {
    usageSubquery.andWhere('usage.createdAt >= :startDate', {
      startDate: params.startDate,
    });
  }
  if (params.endDate) {
    usageSubquery.andWhere('usage.createdAt <= :endDate', {
      endDate: params.endDate,
    });
  }

  const qb = params.userRepository
    .createQueryBuilder('user')
    .leftJoin(
      `(${usageSubquery.getQuery()})`,
      'usageagg',
      'CAST("usageagg"."userId" AS uuid) = CAST("user"."id" AS uuid)',
    )
    .select('user.id', 'userId')
    .where('CAST(user.orgId AS uuid) = CAST(:orgId AS uuid)', {
      orgId: params.organizationId.toString(),
    })
    .groupBy('user.id')
    .addGroupBy('"usageagg"."tokens"')
    .addGroupBy('"usageagg"."requests"')
    .addGroupBy('"usageagg"."cost"');

  // Set parameters from subquery
  qb.setParameters(usageSubquery.getParameters());

  if (params.searchTerm) {
    qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
      search: `%${params.searchTerm}%`,
    });
  }

  const totalRows = await qb.getRawMany<{ userId: string }>();

  return totalRows.length;
}

// Simple record fetchers
export async function findUsageRecordsByOrganization(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageRecord[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.orderBy('usage.createdAt', 'DESC').getMany();
}

export async function findUsageRecordsByUser(
  usageRepository: Repository<UsageRecord>,
  userId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageRecord[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.userId = :userId', { userId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.orderBy('usage.createdAt', 'DESC').getMany();
}

export async function findUsageRecordsByModel(
  usageRepository: Repository<UsageRecord>,
  modelId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageRecord[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.modelId = :modelId', { modelId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.orderBy('usage.createdAt', 'DESC').getMany();
}

export async function getUsageAggregateStats(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageAggregateRow | null> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('SUM(usage.totalTokens)', 'totalTokens')
    .addSelect('COUNT(*)', 'totalRequests')
    .addSelect('SUM(usage.cost)', 'totalCost')
    .addSelect('COUNT(DISTINCT usage.userId)', 'totalUsers')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  const res = await qb.getRawOne<UsageAggregateRow>();

  return res ?? null;
}

export async function countActiveUsersSince(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  activeDate: Date,
): Promise<number> {
  const result = (await usageRepository
    .createQueryBuilder('usage')
    .select('COUNT(DISTINCT usage.userId)', 'activeUsers')
    .where('usage.organizationId = :orgId', { orgId: organizationId })
    .andWhere('usage.createdAt >= :activeDate', { activeDate })
    .getRawOne<{ activeUsers: string }>()) ?? { activeUsers: '0' };

  return parseInt(result.activeUsers) || 0;
}

export async function deleteUsagesOlderThan(
  usageRepository: Repository<UsageRecord>,
  date: Date,
): Promise<number> {
  const result = await usageRepository
    .createQueryBuilder()
    .delete()
    .where('createdAt < :date', { date })
    .execute();

  return result.affected || 0;
}

export async function countUsagesInRange(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.getCount();
}

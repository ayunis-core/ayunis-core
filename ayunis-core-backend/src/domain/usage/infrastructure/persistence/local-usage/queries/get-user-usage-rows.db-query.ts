import { UsageRecord } from '../schema/usage.record';
import { GetUserUsageQueryParams, UserUsageRow } from './usage-query.types';

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
    .addSelect('"lastactivityagg"."lastActivity"', 'lastActivity')
    .where('CAST(user.orgId AS uuid) = CAST(:orgId AS uuid)', {
      orgId: params.organizationId.toString(),
    })
    .groupBy('user.id')
    .addGroupBy('user.name')
    .addGroupBy('user.email')
    .addGroupBy('"usageagg"."tokens"')
    .addGroupBy('"usageagg"."requests"')
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

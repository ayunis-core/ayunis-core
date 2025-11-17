import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { GetUserUsageQueryParams } from './usage-query.types';

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


import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import type {
  GetUserUsageQueryParams,
  UserUsageRow,
} from './usage-query.types';

// All id columns involved are varchar: comparing them uncast keeps the
// (organizationId, createdAt) and (userId, createdAt) indexes usable.
export async function getUserUsageRows(
  params: GetUserUsageQueryParams,
): Promise<UserUsageRow[]> {
  const orgId = params.organizationId.toString();

  const usageSubquery = params.userRepository.manager
    .createQueryBuilder()
    .select('usage.userId', 'userId')
    .addSelect('COALESCE(SUM(usage.creditsConsumed), 0)', 'credits')
    .addSelect('COUNT(usage.id)', 'requests')
    .from(UsageRecord, 'usage')
    .where('usage.organizationId = :orgId', { orgId })
    .groupBy('usage.userId');

  if (params.startDate) {
    usageSubquery.andWhere('usage.createdAt >= :startDate', {
      startDate: params.startDate,
    });
  }
  if (params.endDate) {
    usageSubquery.andWhere('usage.createdAt < :endDate', {
      endDate: params.endDate,
    });
  }

  // Correlated per user so Postgres reads one row from the (userId, createdAt)
  // index instead of aggregating the org's whole usage history.
  const lastActivitySubquery = params.userRepository.manager
    .createQueryBuilder()
    .select('MAX(usageAll.createdAt)')
    .from(UsageRecord, 'usageAll')
    .where('usageAll.userId = "user"."id"')
    .andWhere('usageAll.organizationId = :orgId', { orgId });

  const qb = params.userRepository
    .createQueryBuilder('user')
    .leftJoin(
      `(${usageSubquery.getQuery()})`,
      'usageagg',
      '"usageagg"."userId" = "user"."id"',
    )
    .select('user.id', 'userId')
    .addSelect('user.name', 'userName')
    .addSelect('user.email', 'userEmail')
    .addSelect('COALESCE("usageagg"."credits", 0)', 'credits')
    .addSelect('COALESCE("usageagg"."requests", 0)', 'requests')
    .addSelect(`(${lastActivitySubquery.getQuery()})`, 'lastActivity')
    .where('user.orgId = :orgId', { orgId })
    .setParameters(usageSubquery.getParameters());

  if (params.searchTerm) {
    qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
      search: `%${params.searchTerm}%`,
    });
  }

  return await qb
    .orderBy(mapSortField(params.sortField), params.sortOrder)
    .addOrderBy('user.name', 'ASC')
    .offset(params.offset)
    .limit(params.limit)
    .getRawMany<UserUsageRow>();
}

function mapSortField(sortField: string): string {
  if (sortField.includes('usage.creditsConsumed')) {
    return 'COALESCE("usageagg"."credits", 0)';
  }
  if (sortField.includes('usage.id')) {
    return 'COALESCE("usageagg"."requests", 0)';
  }
  if (
    sortField.includes('usageAll.createdAt') ||
    sortField.includes('usage.createdAt')
  ) {
    return '"lastActivity"';
  }
  return sortField;
}

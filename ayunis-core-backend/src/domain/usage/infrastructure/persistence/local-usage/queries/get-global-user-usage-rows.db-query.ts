import type { Repository } from 'typeorm';
import { UsageRecord } from '../schema/usage.record';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

export interface GlobalUserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  tokens: string | null;
  requests: string;
  lastActivity: Date | null;
  organizationName: string | null;
}

export interface GetGlobalUserUsageQueryParams {
  usageRepository: Repository<UsageRecord>;
  userRepository: Repository<UserRecord>;
  startDate?: Date;
  endDate?: Date;
  limit: number;
}

export async function getGlobalUserUsageRows(
  params: GetGlobalUserUsageQueryParams,
): Promise<GlobalUserUsageRow[]> {
  // Subquery: aggregate tokens and requests per user (optionally filtered by date)
  const usageSubquery = params.usageRepository.manager
    .createQueryBuilder()
    .select('usage.userId', 'userId')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(usage.id)', 'requests')
    .from(UsageRecord, 'usage')
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

  // Subquery: last activity per user (no date filter — always global)
  const lastActivitySubquery = params.usageRepository.manager
    .createQueryBuilder()
    .select('usageAll.userId', 'userId')
    .addSelect('MAX(usageAll.createdAt)', 'lastActivity')
    .from(UsageRecord, 'usageAll')
    .groupBy('usageAll.userId');

  const qb = params.userRepository
    .createQueryBuilder('user')
    .innerJoin('user.org', 'org')
    .innerJoin(
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
    .addSelect('org.name', 'organizationName')
    .setParameters({
      ...usageSubquery.getParameters(),
      ...lastActivitySubquery.getParameters(),
    })
    .orderBy('COALESCE("usageagg"."tokens", 0)', 'DESC')
    .addOrderBy('user.name', 'ASC')
    .limit(params.limit);

  return await qb.getRawMany<GlobalUserUsageRow>();
}

import type { Repository, SelectQueryBuilder } from 'typeorm';
import { UsageRecord } from '../schema/usage.record';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

export interface GlobalUserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  credits: string | null;
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

function buildUsageSubquery(
  params: GetGlobalUserUsageQueryParams,
): SelectQueryBuilder<UsageRecord> {
  const qb = params.usageRepository.manager
    .createQueryBuilder()
    .select('usage.userId', 'userId')
    .addSelect('COALESCE(SUM(usage.creditsConsumed), 0)', 'credits')
    .addSelect('COUNT(usage.id)', 'requests')
    .from(UsageRecord, 'usage')
    .groupBy('usage.userId');

  if (params.startDate) {
    qb.andWhere('usage.createdAt >= :startDate', {
      startDate: params.startDate,
    });
  }
  if (params.endDate) {
    qb.andWhere('usage.createdAt <= :endDate', {
      endDate: params.endDate,
    });
  }
  return qb;
}

function buildLastActivitySubquery(
  params: GetGlobalUserUsageQueryParams,
): SelectQueryBuilder<UsageRecord> {
  return params.usageRepository.manager
    .createQueryBuilder()
    .select('usageAll.userId', 'userId')
    .addSelect('MAX(usageAll.createdAt)', 'lastActivity')
    .from(UsageRecord, 'usageAll')
    .groupBy('usageAll.userId');
}

export async function getGlobalUserUsageRows(
  params: GetGlobalUserUsageQueryParams,
): Promise<GlobalUserUsageRow[]> {
  const usageSubquery = buildUsageSubquery(params);
  const lastActivitySubquery = buildLastActivitySubquery(params);

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
    .addSelect('COALESCE("usageagg"."credits", 0)', 'credits')
    .addSelect('COALESCE("usageagg"."requests", 0)', 'requests')
    .addSelect('"lastactivityagg"."lastActivity"', 'lastActivity')
    .addSelect('org.name', 'organizationName')
    .setParameters({
      ...usageSubquery.getParameters(),
      ...lastActivitySubquery.getParameters(),
    })
    .orderBy('COALESCE("usageagg"."credits", 0)', 'DESC')
    .addOrderBy('user.name', 'ASC')
    .limit(params.limit);

  return await qb.getRawMany<GlobalUserUsageRow>();
}

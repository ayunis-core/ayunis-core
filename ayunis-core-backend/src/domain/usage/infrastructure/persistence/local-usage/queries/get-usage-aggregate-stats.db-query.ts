import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { UsageAggregateRow } from './usage-query.types';

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

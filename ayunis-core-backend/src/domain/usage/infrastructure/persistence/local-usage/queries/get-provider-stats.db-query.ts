import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { ProviderStatsRow } from './usage-query.types';

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

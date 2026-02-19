import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';
import type { ProviderStatsRow } from './usage-query.types';

export async function getGlobalProviderStats(
  usageRepository: Repository<UsageRecord>,
  startDate?: Date,
  endDate?: Date,
  provider?: string,
  modelId?: UUID,
): Promise<ProviderStatsRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('usage.provider', 'provider')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests');

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

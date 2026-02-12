import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { TimeSeriesRow } from './usage-query.types';

export async function getGlobalProviderTimeSeries(
  usageRepository: Repository<UsageRecord>,
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
    .where('usage.provider = :provider', { provider });

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

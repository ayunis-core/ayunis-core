import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';
import type { TimeSeriesRow } from './usage-query.types';

export interface GetProviderTimeSeriesParams {
  usageRepository: Repository<UsageRecord>;
  organizationId: UUID;
  provider: string;
  startDate?: Date;
  endDate?: Date;
  modelId?: UUID;
}

export async function getProviderTimeSeries(
  params: GetProviderTimeSeriesParams,
): Promise<TimeSeriesRow[]> {
  const {
    usageRepository,
    organizationId,
    provider,
    startDate,
    endDate,
    modelId,
  } = params;
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('DATE(usage.createdAt)', 'date')
    .addSelect('COALESCE(SUM(usage.creditsConsumed), 0)', 'credits')
    .addSelect('COUNT(*)', 'requests')
    .where('usage.organizationId = :orgId', { orgId: organizationId })
    .andWhere('usage.provider = :provider', { provider });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt < :endDate', { endDate });
  }
  if (modelId) {
    qb.andWhere('usage.modelId = :modelId', { modelId });
  }

  return await qb
    .groupBy('DATE(usage.createdAt)')
    .orderBy('DATE(usage.createdAt)', 'ASC')
    .getRawMany<TimeSeriesRow>();
}

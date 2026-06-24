import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';
import type { ProviderStatsRow } from './usage-query.types';

export interface GetProviderStatsParams {
  usageRepository: Repository<UsageRecord>;
  organizationId: UUID;
  startDate?: Date;
  endDate?: Date;
  provider?: string;
  modelId?: UUID;
}

export async function getProviderStats(
  params: GetProviderStatsParams,
): Promise<ProviderStatsRow[]> {
  const {
    usageRepository,
    organizationId,
    startDate,
    endDate,
    provider,
    modelId,
  } = params;
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('usage.provider', 'provider')
    .addSelect('COALESCE(SUM(usage.creditsConsumed), 0)', 'credits')
    .addSelect('COUNT(*)', 'requests')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt < :endDate', { endDate });
  }
  if (provider) {
    qb.andWhere('usage.provider = :provider', { provider });
  }
  if (modelId) {
    qb.andWhere('usage.modelId = :modelId', { modelId });
  }

  return await qb.groupBy('usage.provider').getRawMany<ProviderStatsRow>();
}

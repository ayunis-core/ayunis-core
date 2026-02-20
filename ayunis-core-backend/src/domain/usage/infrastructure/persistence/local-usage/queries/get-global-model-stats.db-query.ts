import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import type { ModelStatsRow } from './usage-query.types';

export async function getGlobalModelStats(
  usageRepository: Repository<UsageRecord>,
  startDate?: Date,
  endDate?: Date,
  modelId?: UUID,
): Promise<ModelStatsRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .leftJoin(
      ModelRecord,
      'model',
      'CAST(model.id AS uuid) = CAST(usage.modelId AS uuid)',
    )
    .select('usage.modelId', 'modelId')
    .addSelect('usage.provider', 'provider')
    .addSelect('model.name', 'modelName')
    .addSelect('model.displayName', 'displayName')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests');

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
    .groupBy('usage.modelId, usage.provider, model.name, model.displayName')
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .getRawMany<ModelStatsRow>();
}

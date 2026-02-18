import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import type { TopModelRow } from './usage-query.types';

export async function getTopModels(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
  limit: number = 5,
): Promise<TopModelRow[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .leftJoin(
      ModelRecord,
      'model',
      'CAST(model.id AS uuid) = CAST(usage.modelId AS uuid)',
    )
    .select('usage.modelId', 'modelId')
    .addSelect('model.displayName', 'displayName')
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return qb
    .groupBy('usage.modelId, model.displayName')
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .limit(limit)
    .getRawMany<TopModelRow>();
}

import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import { TopModelRow } from './usage-query.types';

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

  return await qb
    .groupBy('usage.modelId, model.displayName')
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .limit(limit)
    .getRawMany<TopModelRow>();
}


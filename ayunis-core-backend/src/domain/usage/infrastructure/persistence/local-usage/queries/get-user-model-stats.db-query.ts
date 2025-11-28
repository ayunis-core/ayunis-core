import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';
import { ModelRecord } from '../../../../../models/infrastructure/persistence/local-models/schema/model.record';
import { ModelStatsRow } from './usage-query.types';

export async function getUserModelStats(
  usageRepository: Repository<UsageRecord>,
  userId: UUID,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
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
    .addSelect(
      'COALESCE(model.name, CONCAT(\'model-\', LEFT("usage"."modelId"::text, 8)))',
      'modelName',
    )
    .addSelect(
      'COALESCE(model.displayName, CONCAT(\'Model \', LEFT("usage"."modelId"::text, 8)))',
      'displayName',
    )
    .addSelect('SUM(usage.totalTokens)', 'tokens')
    .addSelect('COUNT(*)', 'requests')
    .addSelect('SUM(usage.cost)', 'cost')
    .where('usage.userId = :userId', { userId })
    .andWhere('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb
    .groupBy('usage.modelId')
    .addGroupBy('usage.provider')
    .addGroupBy(
      'COALESCE(model.name, CONCAT(\'model-\', LEFT("usage"."modelId"::text, 8)))',
    )
    .addGroupBy(
      'COALESCE(model.displayName, CONCAT(\'Model \', LEFT("usage"."modelId"::text, 8)))',
    )
    .orderBy('SUM(usage.totalTokens)', 'DESC')
    .getRawMany<ModelStatsRow>();
}

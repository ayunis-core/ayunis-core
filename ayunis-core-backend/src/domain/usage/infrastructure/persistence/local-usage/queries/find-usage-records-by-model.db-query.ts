import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';

export async function findUsageRecordsByModel(
  usageRepository: Repository<UsageRecord>,
  modelId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageRecord[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.modelId = :modelId', { modelId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.orderBy('usage.createdAt', 'DESC').getMany();
}


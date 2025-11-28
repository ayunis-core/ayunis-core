import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';

export async function findUsageRecordsByUser(
  usageRepository: Repository<UsageRecord>,
  userId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageRecord[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.userId = :userId', { userId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.orderBy('usage.createdAt', 'DESC').getMany();
}

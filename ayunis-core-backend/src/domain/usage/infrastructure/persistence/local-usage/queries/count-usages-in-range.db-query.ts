import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';

export async function countUsagesInRange(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.getCount();
}

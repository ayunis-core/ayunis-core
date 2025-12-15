import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UsageRecord } from '../schema/usage.record';

export async function findUsageRecordsByOrganization(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<UsageRecord[]> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt <= :endDate', { endDate });
  }

  return await qb.orderBy('usage.createdAt', 'DESC').getMany();
}

import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';

export async function countActiveUsersSince(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  activeDate: Date,
): Promise<number> {
  const result = (await usageRepository
    .createQueryBuilder('usage')
    .select('COUNT(DISTINCT usage.userId)', 'activeUsers')
    .where('usage.organizationId = :orgId', { orgId: organizationId })
    .andWhere('usage.createdAt >= :activeDate', { activeDate })
    .getRawOne<{ activeUsers: string }>()) ?? { activeUsers: '0' };

  return parseInt(result.activeUsers, 10) || 0;
}

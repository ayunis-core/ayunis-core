import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { UsageRecord } from '../schema/usage.record';

export async function sumCreditsForOrg(
  usageRepository: Repository<UsageRecord>,
  organizationId: UUID,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const qb = usageRepository
    .createQueryBuilder('usage')
    .select('COALESCE(SUM(usage.creditsConsumed), 0)', 'totalCredits')
    .where('usage.organizationId = :orgId', { orgId: organizationId });

  if (startDate) {
    qb.andWhere('usage.createdAt >= :startDate', { startDate });
  }
  if (endDate) {
    qb.andWhere('usage.createdAt < :endDate', { endDate });
  }

  const result = await qb.getRawOne<{ totalCredits: string }>();

  return Math.round(parseFloat(result?.totalCredits ?? '0'));
}

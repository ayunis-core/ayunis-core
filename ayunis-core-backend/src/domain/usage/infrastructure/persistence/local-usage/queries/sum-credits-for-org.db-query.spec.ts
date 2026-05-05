import type { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { sumCreditsForOrg } from './sum-credits-for-org.db-query';
import type { UsageRecord } from '../schema/usage.record';

describe('sumCreditsForOrg', () => {
  function buildRepoReturning(totalCredits: string | undefined) {
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest
        .fn()
        .mockResolvedValue(
          totalCredits === undefined ? undefined : { totalCredits },
        ),
    };
    return {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<UsageRecord>;
  }

  it('preserves fractional credits instead of rounding to nearest integer', async () => {
    const repo = buildRepoReturning('3.7');
    const result = await sumCreditsForOrg(repo, randomUUID());
    expect(result).toBe(3.7);
  });

  it('returns sub-credit fractions as decimals (not 0)', async () => {
    const repo = buildRepoReturning('0.4');
    const result = await sumCreditsForOrg(repo, randomUUID());
    expect(result).toBe(0.4);
  });

  it('returns 0 when there are no usage records', async () => {
    const repo = buildRepoReturning(undefined);
    const result = await sumCreditsForOrg(repo, randomUUID());
    expect(result).toBe(0);
  });

  it('returns 0 when the SUM is "0"', async () => {
    const repo = buildRepoReturning('0');
    const result = await sumCreditsForOrg(repo, randomUUID());
    expect(result).toBe(0);
  });
});

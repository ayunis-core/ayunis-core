import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { UnexpectedSubscriptionError } from '../../subscription.errors';
import { ListUsageBasedSubscriptionOrgIdsUseCase } from './list-usage-based-subscription-org-ids.use-case';

describe('ListUsageBasedSubscriptionOrgIdsUseCase', () => {
  let useCase: ListUsageBasedSubscriptionOrgIdsUseCase;
  let repository: { findActiveUsageBasedOrgIds: jest.Mock };

  const orgA = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgB = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = {
      findActiveUsageBasedOrgIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUsageBasedSubscriptionOrgIdsUseCase,
        { provide: SubscriptionRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(ListUsageBasedSubscriptionOrgIdsUseCase);
  });

  it('returns the org ids reported by the repository, queried as of now', async () => {
    repository.findActiveUsageBasedOrgIds.mockResolvedValue([orgA, orgB]);
    const before = new Date();

    await expect(useCase.execute()).resolves.toEqual([orgA, orgB]);

    const now = repository.findActiveUsageBasedOrgIds.mock.calls[0][0] as Date;
    expect(now.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(now.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('returns an empty list when no org has an active usage-based subscription', async () => {
    await expect(useCase.execute()).resolves.toEqual([]);
  });

  it('wraps repository failures in a domain error', async () => {
    repository.findActiveUsageBasedOrgIds.mockRejectedValue(
      new Error('db down'),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedSubscriptionError,
    );
  });
});

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { UpsertOrgRetentionPolicyUseCase } from './upsert-org-retention-policy.use-case';
import { UpsertOrgRetentionPolicyCommand } from './upsert-org-retention-policy.command';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import { InvalidRetentionPeriodError } from '../../retention-policies.errors';
import { OrgRetentionPolicy } from '../../../domain/org-retention-policy.entity';

describe('UpsertOrgRetentionPolicyUseCase', () => {
  let useCase: UpsertOrgRetentionPolicyUseCase;
  let repository: {
    findByOrgId: jest.Mock;
    upsert: jest.Mock;
    findAllEnabled: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findByOrgId: jest.fn().mockResolvedValue(null),
      upsert: jest
        .fn()
        .mockImplementation((policy: OrgRetentionPolicy) =>
          Promise.resolve(policy),
        ),
      findAllEnabled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpsertOrgRetentionPolicyUseCase,
        { provide: RetentionPoliciesRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(UpsertOrgRetentionPolicyUseCase);
  });

  it('persists an allowed retention window', async () => {
    const orgId = randomUUID();

    const result = await useCase.execute(
      new UpsertOrgRetentionPolicyCommand(orgId, 90),
    );

    expect(result.retentionDays).toBe(90);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, retentionDays: 90 }),
    );
  });

  it('persists null to disable retention (keep forever)', async () => {
    const result = await useCase.execute(
      new UpsertOrgRetentionPolicyCommand(randomUUID(), null),
    );

    expect(result.retentionDays).toBeNull();
    expect(result.isEnabled()).toBe(false);
  });

  it('rejects a value below the allowed floor instead of persisting it', async () => {
    await expect(
      useCase.execute(new UpsertOrgRetentionPolicyCommand(randomUUID(), 1)),
    ).rejects.toBeInstanceOf(InvalidRetentionPeriodError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary off-allowlist value', async () => {
    await expect(
      useCase.execute(new UpsertOrgRetentionPolicyCommand(randomUUID(), 100)),
    ).rejects.toBeInstanceOf(InvalidRetentionPeriodError);
  });

  it('preserves the original id and createdAt when updating an existing policy', async () => {
    const orgId = randomUUID();
    const existing = new OrgRetentionPolicy({
      orgId,
      retentionDays: 30,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repository.findByOrgId.mockResolvedValueOnce(existing);

    const result = await useCase.execute(
      new UpsertOrgRetentionPolicyCommand(orgId, 365),
    );

    expect(result.id).toBe(existing.id);
    expect(result.createdAt).toEqual(existing.createdAt);
    expect(result.retentionDays).toBe(365);
  });
});

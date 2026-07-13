import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { LocalOnboardingRepository } from './local-onboarding.repository';
import type { OnboardingMapper } from './mappers/onboarding.mapper';
import type { OnboardingRecord } from './schema/onboarding.record';

describe('LocalOnboardingRepository', () => {
  let repository: LocalOnboardingRepository;
  let typeOrmRepository: jest.Mocked<
    Pick<Repository<OnboardingRecord>, 'query'>
  >;
  let onboardingMapper: jest.Mocked<Pick<OnboardingMapper, 'toDomain'>>;

  beforeEach(() => {
    typeOrmRepository = { query: jest.fn() };
    onboardingMapper = { toDomain: jest.fn() };
    repository = new LocalOnboardingRepository(
      typeOrmRepository as unknown as Repository<OnboardingRecord>,
      onboardingMapper,
    );
  });

  it('records the first time the welcome video was seen', async () => {
    const userId = randomUUID();
    const seenAt = new Date('2026-08-05T12:00:00.000Z');
    const record = { userId } as OnboardingRecord;
    const onboarding = new Onboarding({
      userId,
      welcomeVideoSeenAt: seenAt,
    });
    typeOrmRepository.query.mockResolvedValue([record]);
    onboardingMapper.toDomain.mockReturnValue(onboarding);

    const result = await repository.markWelcomeVideoSeen(userId, seenAt);

    const [query, parameters] = typeOrmRepository.query.mock.calls[0];
    expect(query).toContain('ON CONFLICT ("userId") DO UPDATE');
    expect(query).toContain(
      'COALESCE(onboarding."welcomeVideoSeenAt", EXCLUDED."welcomeVideoSeenAt")',
    );
    expect(parameters).toEqual([expect.any(String), userId, seenAt]);
    expect(onboardingMapper.toDomain).toHaveBeenCalledWith(record);
    expect(result).toBe(onboarding);
  });

  it('saves checklist progress independently of the welcome video', async () => {
    const userId = randomUUID();
    const onboarding = new Onboarding({
      userId,
      completedStepIds: ['create-assistant'],
      hidden: true,
    });
    const record = { userId } as OnboardingRecord;
    typeOrmRepository.query.mockResolvedValue([record]);
    onboardingMapper.toDomain.mockReturnValue(onboarding);

    const result = await repository.saveProgress(onboarding);

    const [query, parameters] = typeOrmRepository.query.mock.calls[0];
    expect(query).toContain('ON CONFLICT ("userId") DO UPDATE');
    expect(parameters).toEqual([
      onboarding.id,
      userId,
      onboarding.completedStepIds,
      onboarding.hidden,
    ]);
    expect(onboardingMapper.toDomain).toHaveBeenCalledWith(record);
    expect(result).toBe(onboarding);
  });

  it('fails when the database returns no updated record', async () => {
    typeOrmRepository.query.mockResolvedValue([]);

    await expect(
      repository.markWelcomeVideoSeen(randomUUID(), new Date()),
    ).rejects.toThrow('Marking welcome video as seen returned no record');
  });
});

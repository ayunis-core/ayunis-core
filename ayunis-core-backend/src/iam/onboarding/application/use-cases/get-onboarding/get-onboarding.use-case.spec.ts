import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { GetOnboardingUseCase } from './get-onboarding.use-case';
import { GetOnboardingQuery } from './get-onboarding.query';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { Onboarding } from '../../../domain/onboarding.entity';

describe('GetOnboardingUseCase', () => {
  let useCase: GetOnboardingUseCase;
  let mockOnboardingRepository: Partial<OnboardingRepository>;

  beforeAll(async () => {
    mockOnboardingRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOnboardingUseCase,
        { provide: OnboardingRepository, useValue: mockOnboardingRepository },
      ],
    }).compile();

    useCase = module.get<GetOnboardingUseCase>(GetOnboardingUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the persisted onboarding for the user', async () => {
    const stored = new Onboarding({
      userId: 'user-id' as UUID,
      completedStepIds: ['create-assistant', 'start-chat'],
      hidden: true,
    });
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(stored);

    const result = await useCase.execute(
      new GetOnboardingQuery('user-id' as UUID),
    );

    expect(result).toBe(stored);
  });

  it('should return a default empty onboarding when none exists yet', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(null);

    const result = await useCase.execute(
      new GetOnboardingQuery('new-user-id' as UUID),
    );

    expect(result.userId).toBe('new-user-id');
    expect(result.completedStepIds).toEqual([]);
    expect(result.hidden).toBe(false);
    expect(mockOnboardingRepository.save).not.toHaveBeenCalled();
  });
});

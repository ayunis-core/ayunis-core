import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UpdateOnboardingUseCase } from './update-onboarding.use-case';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { OnboardingRepository } from 'src/iam/onboarding/application/ports/onboarding.repository';

describe('UpdateOnboardingUseCase', () => {
  let useCase: UpdateOnboardingUseCase;
  let mockOnboardingRepository: Partial<OnboardingRepository>;

  beforeAll(async () => {
    mockOnboardingRepository = {
      findByUserId: jest.fn(),
      saveProgress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOnboardingUseCase,
        { provide: OnboardingRepository, useValue: mockOnboardingRepository },
      ],
    }).compile();

    useCase = module.get<UpdateOnboardingUseCase>(UpdateOnboardingUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save the submitted progress without loading current onboarding', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'saveProgress')
      .mockImplementation((onboarding) => Promise.resolve(onboarding));

    const result = await useCase.execute(
      new UpdateOnboardingCommand(
        'user-id' as UUID,
        ['create-assistant', 'start-chat'],
        true,
      ),
    );

    expect(result.completedStepIds).toEqual(['create-assistant', 'start-chat']);
    expect(result.hidden).toBe(true);
    expect(mockOnboardingRepository.findByUserId).not.toHaveBeenCalled();
    expect(mockOnboardingRepository.saveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        completedStepIds: ['create-assistant', 'start-chat'],
        hidden: true,
      }),
    );
  });

  it('should save progress for a user without an onboarding row yet', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'saveProgress')
      .mockImplementation((onboarding) => Promise.resolve(onboarding));

    const result = await useCase.execute(
      new UpdateOnboardingCommand(
        'new-user-id' as UUID,
        ['create-assistant'],
        false,
      ),
    );

    expect(result.userId).toBe('new-user-id');
    expect(result.completedStepIds).toEqual(['create-assistant']);
    expect(result.hidden).toBe(false);
    expect(mockOnboardingRepository.saveProgress).toHaveBeenCalledTimes(1);
  });

  it('should wrap unexpected repository failures in OnboardingUnexpectedError', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'saveProgress')
      .mockRejectedValue(new Error('connection lost'));

    await expect(
      useCase.execute(
        new UpdateOnboardingCommand(
          'user-id' as UUID,
          ['create-assistant'],
          false,
        ),
      ),
    ).rejects.toThrow('An unexpected error occurred');
  });
});

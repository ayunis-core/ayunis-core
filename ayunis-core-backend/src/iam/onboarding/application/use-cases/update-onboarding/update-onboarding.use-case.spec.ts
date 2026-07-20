import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UpdateOnboardingUseCase } from './update-onboarding.use-case';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';

describe('UpdateOnboardingUseCase', () => {
  let useCase: UpdateOnboardingUseCase;
  let mockOnboardingRepository: Partial<OnboardingRepository>;

  beforeAll(async () => {
    mockOnboardingRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
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

  it('should update the existing onboarding with completed steps and hidden flag', async () => {
    const existing = new Onboarding({ userId: 'user-id' as UUID });
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(existing);
    jest
      .spyOn(mockOnboardingRepository, 'save')
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
    expect(mockOnboardingRepository.save).toHaveBeenCalledWith(existing);
  });

  it('should create onboarding for the user when none exists yet', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(null);
    jest
      .spyOn(mockOnboardingRepository, 'save')
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
    expect(mockOnboardingRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should wrap unexpected repository failures in OnboardingUnexpectedError', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(new Onboarding({ userId: 'user-id' as UUID }));
    jest
      .spyOn(mockOnboardingRepository, 'save')
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

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UpdateOnboardingUseCase } from './update-onboarding.use-case';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { OnboardingRepository } from 'src/iam/onboarding/application/ports/onboarding.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUpdatedEvent } from 'src/iam/onboarding/application/events/onboarding-updated.event';

describe('UpdateOnboardingUseCase', () => {
  let useCase: UpdateOnboardingUseCase;
  let mockOnboardingRepository: Partial<OnboardingRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeAll(async () => {
    mockOnboardingRepository = {
      findByUserId: jest.fn(),
      saveProgress: jest.fn(),
    };
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOnboardingUseCase,
        { provide: OnboardingRepository, useValue: mockOnboardingRepository },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    useCase = module.get<UpdateOnboardingUseCase>(UpdateOnboardingUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit the previous and persisted progress after saving an update', async () => {
    const previous = new Onboarding({
      userId: 'user-id' as UUID,
      completedStepIds: ['create-assistant'],
      hidden: false,
    });
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(previous);
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
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      OnboardingUpdatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: 'user-id',
        previousCompletedStepIds: ['create-assistant'],
        completedStepIds: ['create-assistant', 'start-chat'],
        previousHidden: false,
        hidden: true,
      }),
    );
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
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(null);
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
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      OnboardingUpdatedEvent.EVENT_NAME,
      expect.objectContaining({
        previousCompletedStepIds: [],
        previousHidden: false,
      }),
    );
  });

  it('should wrap unexpected repository failures in OnboardingUnexpectedError', async () => {
    jest
      .spyOn(mockOnboardingRepository, 'findByUserId')
      .mockResolvedValue(null);
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

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});

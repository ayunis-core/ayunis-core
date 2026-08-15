import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { MarkWelcomeVideoSeenCommand } from './mark-welcome-video-seen.command';
import { MarkWelcomeVideoSeenUseCase } from './mark-welcome-video-seen.use-case';

describe('MarkWelcomeVideoSeenUseCase', () => {
  let useCase: MarkWelcomeVideoSeenUseCase;
  let onboardingRepository: jest.Mocked<
    Pick<OnboardingRepository, 'markWelcomeVideoSeen'>
  >;

  beforeEach(async () => {
    onboardingRepository = {
      markWelcomeVideoSeen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkWelcomeVideoSeenUseCase,
        {
          provide: getLoggerToken(MarkWelcomeVideoSeenUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: OnboardingRepository, useValue: onboardingRepository },
      ],
    }).compile();

    useCase = module.get(MarkWelcomeVideoSeenUseCase);
  });

  it('records when the current user saw the welcome video', async () => {
    const userId = randomUUID();
    const onboarding = new Onboarding({
      userId,
      welcomeVideoSeenAt: new Date('2026-08-05T12:00:00.000Z'),
    });
    onboardingRepository.markWelcomeVideoSeen.mockResolvedValue(onboarding);

    const result = await useCase.execute(
      new MarkWelcomeVideoSeenCommand(userId),
    );

    expect(onboardingRepository.markWelcomeVideoSeen).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
    );
    expect(result.welcomeVideoSeenAt).toEqual(
      new Date('2026-08-05T12:00:00.000Z'),
    );
  });

  it('wraps unexpected repository failures', async () => {
    onboardingRepository.markWelcomeVideoSeen.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute(new MarkWelcomeVideoSeenCommand(randomUUID())),
    ).rejects.toThrow('An unexpected error occurred');
  });
});

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyModuleViewTime } from 'src/domain/academy/domain/academy-module-view-time.entity';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import { GetAcademyMinimumModuleSecondsUseCase } from 'src/iam/platform-config/application/use-cases/get-academy-minimum-module-seconds/get-academy-minimum-module-seconds.use-case';
import { certificateExpiresAt } from 'src/domain/academy/application/util/certificate-validity';
import { GetAcademyProgressQuery } from './get-academy-progress.query';
import { GetAcademyProgressUseCase } from './get-academy-progress.use-case';

describe('GetAcademyProgressUseCase', () => {
  let useCase: GetAcademyProgressUseCase;
  let confirmationRepository: jest.Mocked<AcademyChapterConfirmationRepository>;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;
  let viewTimeRepository: jest.Mocked<AcademyModuleViewTimeRepository>;

  const userId = randomUUID();
  const chapterId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAcademyProgressUseCase,
        {
          provide: AcademyChapterConfirmationRepository,
          useValue: { findAllByUser: jest.fn() },
        },
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn() },
        },
        {
          provide: AcademyModuleViewTimeRepository,
          useValue: { findAllByUser: jest.fn() },
        },
        {
          provide: GetAcademyMinimumModuleSecondsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(60) },
        },
      ],
    }).compile();

    useCase = module.get(GetAcademyProgressUseCase);
    confirmationRepository = module.get(AcademyChapterConfirmationRepository);
    completionRepository = module.get(AcademyCompletionRepository);
    viewTimeRepository = module.get(AcademyModuleViewTimeRepository);
    viewTimeRepository.findAllByUser.mockResolvedValue([]);
  });

  function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  it('maps chapter confirmations and the completion snapshot', async () => {
    const confirmedAt = daysAgo(30);
    const completedAt = daysAgo(29);
    confirmationRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterConfirmation({ userId, chapterId, confirmedAt }),
    ]);
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({ userId, completedAt }),
    );

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result).toEqual({
      chapters: [
        {
          chapterId,
          confirmed: true,
          confirmationValid: true,
          confirmedAt,
          replayable: false,
        },
      ],
      academyCompletedAt: completedAt,
      academyCompletionExpiresAt: certificateExpiresAt(completedAt),
      courseModules: [],
      minimumModuleSeconds: 60,
    });
  });

  it('reports visible seconds per course module and the minimum', async () => {
    const courseModuleId = randomUUID();
    confirmationRepository.findAllByUser.mockResolvedValue([]);
    completionRepository.findByUser.mockResolvedValue(null);
    viewTimeRepository.findAllByUser.mockResolvedValue([
      new AcademyModuleViewTime({ userId, courseModuleId, visibleSeconds: 42 }),
    ]);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.courseModules).toEqual([
      { courseModuleId, visibleSeconds: 42 },
    ]);
    expect(result.minimumModuleSeconds).toBe(60);
  });

  it('marks a confirmation from moments ago as replayable', async () => {
    confirmationRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterConfirmation({
        userId,
        chapterId,
        confirmedAt: new Date(Date.now() - 60 * 1000),
      }),
    ]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.chapters[0].replayable).toBe(true);
  });

  it('reports an aged-out confirmation as no longer valid', async () => {
    const confirmedAt = daysAgo(400);
    confirmationRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterConfirmation({ userId, chapterId, confirmedAt }),
    ]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.chapters[0]).toMatchObject({
      confirmed: true,
      confirmationValid: false,
      confirmedAt,
    });
  });

  it('returns empty progress when no chapter has been confirmed', async () => {
    confirmationRepository.findAllByUser.mockResolvedValue([]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.chapters).toEqual([]);
    expect(result.academyCompletedAt).toBeNull();
    expect(result.academyCompletionExpiresAt).toBeNull();
  });
});

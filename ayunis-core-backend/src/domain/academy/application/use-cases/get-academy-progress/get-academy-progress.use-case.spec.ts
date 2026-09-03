import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { GetAcademyProgressUseCase } from './get-academy-progress.use-case';
import { GetAcademyProgressQuery } from './get-academy-progress.query';
import { AcademyChapterProgressRepository } from 'src/domain/academy/application/ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyChapterProgress } from 'src/domain/academy/domain/academy-chapter-progress.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { certificateExpiresAt } from 'src/domain/academy/application/util/certificate-validity';

describe('GetAcademyProgressUseCase', () => {
  let useCase: GetAcademyProgressUseCase;
  let progressRepository: jest.Mocked<AcademyChapterProgressRepository>;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;

  const userId = randomUUID();
  const chapterId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAcademyProgressUseCase,
        {
          provide: AcademyChapterProgressRepository,
          useValue: { findAllByUser: jest.fn() },
        },
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetAcademyProgressUseCase);
    progressRepository = module.get(AcademyChapterProgressRepository);
    completionRepository = module.get(AcademyCompletionRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // Relative so the assertions don't start failing once a hardcoded date ages
  // past the certificate validity period.
  function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  function mockProgress(passedAt: Date): void {
    progressRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterProgress({
        userId,
        chapterId,
        passedAt,
        lastScore: 90,
        lastAttemptAt: passedAt,
      }),
    ]);
  }

  it('maps progress rows and the completion snapshot', async () => {
    const passedAt = daysAgo(30);
    const completedAt = daysAgo(29);
    mockProgress(passedAt);
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({ userId, completedAt }),
    );

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.academyCompletedAt).toEqual(completedAt);
    expect(result.academyCompletionExpiresAt).toEqual(
      certificateExpiresAt(completedAt),
    );
    expect(result.chapters).toEqual([
      {
        chapterId,
        passed: true,
        passValid: true,
        lastScore: 90,
        lastPassedAt: passedAt,
      },
    ]);
  });

  it('reports a pass that aged out of the validity window as no longer valid', async () => {
    // 12 months is at most 366 days, so 400 days is unambiguously outside it.
    const passedAt = daysAgo(400);
    mockProgress(passedAt);
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({ userId, completedAt: passedAt }),
    );

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.chapters[0].passed).toBe(true);
    expect(result.chapters[0].passValid).toBe(false);
    expect(result.academyCompletionExpiresAt!.getTime()).toBeLessThan(
      Date.now(),
    );
  });

  it('returns a null completion date when the academy is not completed', async () => {
    progressRepository.findAllByUser.mockResolvedValue([]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.academyCompletedAt).toBeNull();
    expect(result.academyCompletionExpiresAt).toBeNull();
    expect(result.chapters).toEqual([]);
  });
});

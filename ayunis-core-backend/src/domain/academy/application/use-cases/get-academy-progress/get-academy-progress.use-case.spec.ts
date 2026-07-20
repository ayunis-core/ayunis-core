import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GetAcademyProgressUseCase } from './get-academy-progress.use-case';
import { GetAcademyProgressQuery } from './get-academy-progress.query';
import { AcademyChapterProgressRepository } from '../../ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { AcademyChapterProgress } from 'src/domain/academy/domain/academy-chapter-progress.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';

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
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('maps progress rows and the completion snapshot', async () => {
    const passedAt = new Date('2026-02-01T00:00:00Z');
    const completedAt = new Date('2026-02-02T00:00:00Z');
    progressRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterProgress({
        userId,
        chapterId,
        passedAt,
        lastScore: 90,
        lastAttemptAt: passedAt,
      }),
    ]);
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({ userId, completedAt }),
    );

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.academyCompletedAt).toEqual(completedAt);
    expect(result.chapters).toEqual([
      { chapterId, passed: true, lastScore: 90, lastPassedAt: passedAt },
    ]);
  });

  it('returns a null completion date when the academy is not completed', async () => {
    progressRepository.findAllByUser.mockResolvedValue([]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.academyCompletedAt).toBeNull();
    expect(result.chapters).toEqual([]);
  });
});

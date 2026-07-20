import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { SubmitChapterQuizUseCase } from './submit-chapter-quiz.use-case';
import type { QuizAnswerSubmission } from './submit-chapter-quiz.command';
import { SubmitChapterQuizCommand } from './submit-chapter-quiz.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapterProgressRepository } from '../../ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyChapterProgress } from 'src/domain/academy/domain/academy-chapter-progress.entity';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  InvalidQuizSubmissionError,
  QuizNotAvailableError,
} from '../../academy.errors';

function makePool(chapterId: UUID, count: number): AcademyQuizQuestion[] {
  return Array.from(
    { length: count },
    (_, i) =>
      new AcademyQuizQuestion({
        chapterId,
        text: `Question ${i}`,
        position: i,
        // index 0 is correct, index 1 is wrong
        options: [
          { text: 'Correct', isCorrect: true },
          { text: 'Wrong', isCorrect: false },
        ],
      }),
  );
}

// Answer the first `correct` questions correctly (index 0) and the rest wrong.
function answersFor(
  pool: AcademyQuizQuestion[],
  correct: number,
): QuizAnswerSubmission[] {
  return pool.map((q, i) => ({
    questionId: q.id,
    selectedOptionIndex: i < correct ? 0 : 1,
  }));
}

describe('SubmitChapterQuizUseCase', () => {
  let useCase: SubmitChapterQuizUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let quizQuestionRepository: jest.Mocked<AcademyQuizQuestionRepository>;
  let progressRepository: jest.Mocked<AcademyChapterProgressRepository>;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;

  const userId = randomUUID();
  const chapter = new AcademyChapter({
    title: 'Getting Started',
    description: 'Basics',
    position: 0,
    quizEnabled: true,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitChapterQuizUseCase,
        {
          provide: AcademyChapterRepository,
          useValue: { findOne: jest.fn(), findQuizEnabledIds: jest.fn() },
        },
        {
          provide: AcademyQuizQuestionRepository,
          useValue: { findAllByChapter: jest.fn() },
        },
        {
          provide: AcademyChapterProgressRepository,
          useValue: {
            findByUserAndChapter: jest.fn(),
            findAllByUser: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn(), upsert: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SubmitChapterQuizUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    quizQuestionRepository = module.get(AcademyQuizQuestionRepository);
    progressRepository = module.get(AcademyChapterProgressRepository);
    completionRepository = module.get(AcademyCompletionRepository);

    chapterRepository.findOne.mockResolvedValue(chapter);
    chapterRepository.findQuizEnabledIds.mockResolvedValue([chapter.id]);
    progressRepository.findByUserAndChapter.mockResolvedValue(null);
    progressRepository.upsert.mockImplementation(async (p) => p);
    completionRepository.findByUser.mockResolvedValue(null);
    completionRepository.upsert.mockImplementation(async (c) => c);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  function submit(answers: QuizAnswerSubmission[]) {
    return useCase.execute(
      new SubmitChapterQuizCommand({ userId, chapterId: chapter.id, answers }),
    );
  }

  it('passes at 8 of 10 correct (80% threshold)', async () => {
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);
    progressRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterProgress({
        userId,
        chapterId: chapter.id,
        passedAt: new Date(),
        lastScore: 80,
        lastAttemptAt: new Date(),
      }),
    ]);

    const result = await submit(answersFor(pool, 8));

    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(8);
    expect(result.totalCount).toBe(10);
    expect(result.requiredCount).toBe(8);
    expect(result.score).toBe(80);
    expect(result.academyCompleted).toBe(true);
  });

  it('fails at 7 of 10 correct', async () => {
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);

    const result = await submit(answersFor(pool, 7));

    expect(result.passed).toBe(false);
    expect(result.requiredCount).toBe(8);
    expect(result.academyCompleted).toBe(false);
    expect(completionRepository.upsert).not.toHaveBeenCalled();
  });

  it('scales the required count for a pool smaller than 10 (6 of 7 passes)', async () => {
    const pool = makePool(chapter.id, 7);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);
    progressRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterProgress({
        userId,
        chapterId: chapter.id,
        passedAt: new Date(),
        lastScore: 86,
        lastAttemptAt: new Date(),
      }),
    ]);

    const result = await submit(answersFor(pool, 6));

    expect(result.requiredCount).toBe(6);
    expect(result.passed).toBe(true);
  });

  it('fails a small pool below its scaled threshold (5 of 7)', async () => {
    const pool = makePool(chapter.id, 7);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);

    const result = await submit(answersFor(pool, 5));

    expect(result.requiredCount).toBe(6);
    expect(result.passed).toBe(false);
  });

  it('stamps passedAt on the progress row when passing', async () => {
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);
    progressRepository.findAllByUser.mockResolvedValue([]);

    await submit(answersFor(pool, 10));

    const saved = progressRepository.upsert.mock.calls[0][0];
    expect(saved.passedAt).not.toBeNull();
    expect(saved.lastScore).toBe(100);
  });

  it('keeps a previous pass when a later attempt fails', async () => {
    const previousPass = new Date('2026-01-01T00:00:00Z');
    progressRepository.findByUserAndChapter.mockResolvedValue(
      new AcademyChapterProgress({
        userId,
        chapterId: chapter.id,
        passedAt: previousPass,
        lastScore: 90,
        lastAttemptAt: previousPass,
      }),
    );
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);

    await submit(answersFor(pool, 3));

    const saved = progressRepository.upsert.mock.calls[0][0];
    expect(saved.passedAt).toEqual(previousPass);
    expect(saved.lastScore).toBe(30);
  });

  it('does not stamp academy completion while another quiz chapter is unpassed', async () => {
    const otherChapterId = randomUUID();
    chapterRepository.findQuizEnabledIds.mockResolvedValue([
      chapter.id,
      otherChapterId,
    ]);
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);
    progressRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterProgress({
        userId,
        chapterId: chapter.id,
        passedAt: new Date(),
        lastScore: 100,
        lastAttemptAt: new Date(),
      }),
    ]);

    const result = await submit(answersFor(pool, 10));

    expect(result.passed).toBe(true);
    expect(result.academyCompleted).toBe(false);
    expect(completionRepository.upsert).not.toHaveBeenCalled();
  });

  it('stamps academy completion once every quiz chapter is passed', async () => {
    const otherChapterId = randomUUID();
    chapterRepository.findQuizEnabledIds.mockResolvedValue([
      chapter.id,
      otherChapterId,
    ]);
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);
    progressRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterProgress({
        userId,
        chapterId: chapter.id,
        passedAt: new Date(),
        lastScore: 100,
        lastAttemptAt: new Date(),
      }),
      new AcademyChapterProgress({
        userId,
        chapterId: otherChapterId,
        passedAt: new Date(),
        lastScore: 100,
        lastAttemptAt: new Date(),
      }),
    ]);

    const result = await submit(answersFor(pool, 10));

    expect(result.academyCompleted).toBe(true);
    expect(completionRepository.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects a submission with fewer answers than drawn', async () => {
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);

    await expect(submit(answersFor(pool, 10).slice(0, 3))).rejects.toThrow(
      InvalidQuizSubmissionError,
    );
    expect(progressRepository.upsert).not.toHaveBeenCalled();
  });

  it('rejects an answer referencing a question outside the chapter pool', async () => {
    const pool = makePool(chapter.id, 10);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);
    const answers = answersFor(pool, 10);
    answers[0] = { questionId: randomUUID(), selectedOptionIndex: 0 };

    await expect(submit(answers)).rejects.toThrow(InvalidQuizSubmissionError);
    expect(progressRepository.upsert).not.toHaveBeenCalled();
  });

  it('rejects a submission when the chapter has no questions', async () => {
    quizQuestionRepository.findAllByChapter.mockResolvedValue([]);

    await expect(submit([])).rejects.toThrow(QuizNotAvailableError);
    await expect(submit([])).rejects.toThrow(
      `No quiz is available for chapter ${chapter.id}`,
    );
    expect(progressRepository.upsert).not.toHaveBeenCalled();
  });
});

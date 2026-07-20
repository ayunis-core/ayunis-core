import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { GetChapterQuizUseCase } from './get-chapter-quiz.use-case';
import { GetChapterQuizQuery } from './get-chapter-quiz.query';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  ChapterNotFoundError,
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
        options: [
          { text: 'Correct', isCorrect: true },
          { text: 'Wrong', isCorrect: false },
        ],
      }),
  );
}

describe('GetChapterQuizUseCase', () => {
  let useCase: GetChapterQuizUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let quizQuestionRepository: jest.Mocked<AcademyQuizQuestionRepository>;

  const chapter = new AcademyChapter({
    title: 'Getting Started',
    description: 'Basics',
    position: 0,
    quizEnabled: true,
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetChapterQuizUseCase,
        { provide: AcademyChapterRepository, useValue: { findOne: jest.fn() } },
        {
          provide: AcademyQuizQuestionRepository,
          useValue: { findAllByChapter: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetChapterQuizUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    quizQuestionRepository = module.get(AcademyQuizQuestionRepository);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('draws exactly 10 distinct questions from a larger pool', async () => {
    const pool = makePool(chapter.id, 15);
    chapterRepository.findOne.mockResolvedValue(chapter);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);

    const result = await useCase.execute(
      new GetChapterQuizQuery({ chapterId: chapter.id }),
    );

    expect(result).toHaveLength(10);
    const ids = new Set(result.map((q) => q.id));
    expect(ids.size).toBe(10);
    const poolIds = new Set(pool.map((q) => q.id));
    expect(result.every((q) => poolIds.has(q.id))).toBe(true);
  });

  it('draws the whole pool when it holds fewer than 10 questions', async () => {
    const pool = makePool(chapter.id, 7);
    chapterRepository.findOne.mockResolvedValue(chapter);
    quizQuestionRepository.findAllByChapter.mockResolvedValue(pool);

    const result = await useCase.execute(
      new GetChapterQuizQuery({ chapterId: chapter.id }),
    );

    expect(result).toHaveLength(7);
  });

  it('throws when the chapter does not exist', async () => {
    chapterRepository.findOne.mockResolvedValue(null);
    await expect(
      useCase.execute(new GetChapterQuizQuery({ chapterId: randomUUID() })),
    ).rejects.toThrow(ChapterNotFoundError);
  });

  it('throws when the quiz is not enabled', async () => {
    chapterRepository.findOne.mockResolvedValue(
      new AcademyChapter({
        title: 'No quiz',
        description: '',
        position: 1,
        quizEnabled: false,
      }),
    );
    await expect(
      useCase.execute(new GetChapterQuizQuery({ chapterId: chapter.id })),
    ).rejects.toThrow(QuizNotAvailableError);
  });

  it('throws when the pool is empty', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    quizQuestionRepository.findAllByChapter.mockResolvedValue([]);
    await expect(
      useCase.execute(new GetChapterQuizQuery({ chapterId: chapter.id })),
    ).rejects.toThrow(QuizNotAvailableError);
  });
});

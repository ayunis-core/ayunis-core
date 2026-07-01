import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateQuizQuestionUseCase } from './create-quiz-question.use-case';
import { CreateQuizQuestionCommand } from './create-quiz-question.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import {
  ChapterNotFoundError,
  InvalidQuizQuestionError,
} from '../../academy.errors';

const validOptions = [
  { text: 'A large language model', isCorrect: true },
  { text: 'A database', isCorrect: false },
];

describe('CreateQuizQuestionUseCase', () => {
  let useCase: CreateQuizQuestionUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let quizQuestionRepository: jest.Mocked<AcademyQuizQuestionRepository>;

  const chapter = new AcademyChapter({
    title: 'Getting Started',
    description: 'Basics of Ayunis Core',
    position: 0,
  });

  beforeAll(async () => {
    const mockChapterRepository = { findOne: jest.fn() };
    const mockQuizQuestionRepository = {
      findMaxPosition: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateQuizQuestionUseCase,
        { provide: AcademyChapterRepository, useValue: mockChapterRepository },
        {
          provide: AcademyQuizQuestionRepository,
          useValue: mockQuizQuestionRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateQuizQuestionUseCase>(CreateQuizQuestionUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    quizQuestionRepository = module.get(AcademyQuizQuestionRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a question appended after the last position', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    quizQuestionRepository.findMaxPosition.mockResolvedValue(3);
    quizQuestionRepository.create.mockImplementation(
      async (question: AcademyQuizQuestion) => question,
    );

    const result = await useCase.execute(
      new CreateQuizQuestionCommand({
        chapterId: chapter.id,
        text: 'What is an LLM?',
        options: validOptions,
      }),
    );

    expect(result.position).toBe(4);
    expect(result.chapterId).toBe(chapter.id);
    expect(quizQuestionRepository.create).toHaveBeenCalledWith(
      expect.any(AcademyQuizQuestion),
    );
  });

  it('should create the first question of a chapter at position 0', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    quizQuestionRepository.findMaxPosition.mockResolvedValue(null);
    quizQuestionRepository.create.mockImplementation(
      async (question: AcademyQuizQuestion) => question,
    );

    const result = await useCase.execute(
      new CreateQuizQuestionCommand({
        chapterId: chapter.id,
        text: 'What is an LLM?',
        options: validOptions,
      }),
    );

    expect(result.position).toBe(0);
  });

  it('should reject creation for a non-existent chapter', async () => {
    chapterRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new CreateQuizQuestionCommand({
          chapterId: randomUUID(),
          text: 'Orphan question',
          options: validOptions,
        }),
      ),
    ).rejects.toThrow(ChapterNotFoundError);
    expect(quizQuestionRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a question without exactly one correct option', async () => {
    await expect(
      useCase.execute(
        new CreateQuizQuestionCommand({
          chapterId: chapter.id,
          text: 'No correct answer',
          options: [
            { text: 'Option A', isCorrect: false },
            { text: 'Option B', isCorrect: false },
          ],
        }),
      ),
    ).rejects.toThrow(InvalidQuizQuestionError);
    expect(quizQuestionRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a question with fewer than two options', async () => {
    await expect(
      useCase.execute(
        new CreateQuizQuestionCommand({
          chapterId: chapter.id,
          text: 'Only one option',
          options: [{ text: 'Option A', isCorrect: true }],
        }),
      ),
    ).rejects.toThrow(InvalidQuizQuestionError);
    expect(quizQuestionRepository.create).not.toHaveBeenCalled();
  });
});

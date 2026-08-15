import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import { UpdateQuizQuestionUseCase } from './update-quiz-question.use-case';
import { UpdateQuizQuestionCommand } from './update-quiz-question.command';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  InvalidQuizQuestionError,
  QuizQuestionNotFoundError,
} from '../../academy.errors';

const validOptions = [
  { text: 'A large language model', isCorrect: true },
  { text: 'A database', isCorrect: false },
];

describe('UpdateQuizQuestionUseCase', () => {
  let useCase: UpdateQuizQuestionUseCase;
  let quizQuestionRepository: jest.Mocked<AcademyQuizQuestionRepository>;

  const existing = new AcademyQuizQuestion({
    chapterId: randomUUID(),
    text: 'Original question',
    options: validOptions,
    position: 2,
  });

  beforeAll(async () => {
    const mockQuizQuestionRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getLoggerToken(UpdateQuizQuestionUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        UpdateQuizQuestionUseCase,
        {
          provide: AcademyQuizQuestionRepository,
          useValue: mockQuizQuestionRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateQuizQuestionUseCase>(UpdateQuizQuestionUseCase);
    quizQuestionRepository = module.get(AcademyQuizQuestionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update the prompt and options while preserving position', async () => {
    quizQuestionRepository.findOne.mockResolvedValue(existing);
    quizQuestionRepository.update.mockImplementation(
      async (question: AcademyQuizQuestion) => question,
    );

    const result = await useCase.execute(
      new UpdateQuizQuestionCommand({
        quizQuestionId: existing.id,
        text: 'Updated question',
        options: validOptions,
      }),
    );

    expect(result.text).toBe('Updated question');
    expect(result.position).toBe(2);
    expect(result.chapterId).toBe(existing.chapterId);
  });

  it('should reject update for a non-existent question', async () => {
    quizQuestionRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateQuizQuestionCommand({
          quizQuestionId: randomUUID(),
          text: 'Ghost question',
          options: validOptions,
        }),
      ),
    ).rejects.toThrow(QuizQuestionNotFoundError);
    expect(quizQuestionRepository.update).not.toHaveBeenCalled();
  });

  it('should reject an update with multiple correct options', async () => {
    await expect(
      useCase.execute(
        new UpdateQuizQuestionCommand({
          quizQuestionId: existing.id,
          text: 'Two correct answers',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: true },
          ],
        }),
      ),
    ).rejects.toThrow(InvalidQuizQuestionError);
    expect(quizQuestionRepository.update).not.toHaveBeenCalled();
  });
});

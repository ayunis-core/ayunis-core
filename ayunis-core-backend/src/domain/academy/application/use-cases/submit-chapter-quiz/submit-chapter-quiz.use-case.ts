import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapterProgressRepository } from '../../ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { AcademyChapterProgress } from '../../../domain/academy-chapter-progress.entity';
import { AcademyCompletion } from '../../../domain/academy-completion.entity';
import { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import {
  ChapterNotFoundError,
  InvalidQuizSubmissionError,
  QuizNotAvailableError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { DRAWN_QUESTION_COUNT, requiredCorrect } from '../../quiz.constants';
import {
  QuizAnswerSubmission,
  SubmitChapterQuizCommand,
} from './submit-chapter-quiz.command';

export interface QuizAttemptResult {
  readonly passed: boolean;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly requiredCount: number;
  readonly score: number;
  readonly academyCompleted: boolean;
}

@Injectable()
export class SubmitChapterQuizUseCase {
  private readonly logger = new Logger(SubmitChapterQuizUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
    private readonly progressRepository: AcademyChapterProgressRepository,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  async execute(command: SubmitChapterQuizCommand): Promise<QuizAttemptResult> {
    this.logger.log('Submitting chapter quiz', {
      userId: command.userId,
      chapterId: command.chapterId,
    });
    try {
      const chapter = await this.loadQuizChapter(command.chapterId);
      const pool = await this.quizQuestionRepository.findAllByChapter(
        command.chapterId,
      );
      const grade = this.grade(pool, command.answers, chapter.passThreshold);
      await this.persistProgress(command, grade);
      const academyCompleted = grade.passed
        ? await this.recomputeCompletion(command.userId)
        : false;
      return { ...grade, academyCompleted };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error submitting chapter quiz', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }

  private async loadQuizChapter(chapterId: UUID): Promise<AcademyChapter> {
    const chapter = await this.chapterRepository.findOne(chapterId);
    if (!chapter) {
      throw new ChapterNotFoundError(chapterId);
    }
    if (!chapter.quizEnabled) {
      throw new QuizNotAvailableError(chapterId);
    }
    return chapter;
  }

  private grade(
    pool: AcademyQuizQuestion[],
    answers: QuizAnswerSubmission[],
    thresholdPct: number,
  ): Omit<QuizAttemptResult, 'academyCompleted'> {
    if (pool.length === 0) {
      throw new QuizNotAvailableError('quiz has no questions');
    }
    const expectedCount = Math.min(DRAWN_QUESTION_COUNT, pool.length);
    this.assertAnswerShape(answers, expectedCount);
    const byId = new Map(pool.map((question) => [question.id, question]));
    let correctCount = 0;
    for (const answer of answers) {
      if (this.isAnswerCorrect(byId, answer)) correctCount++;
    }
    const totalCount = answers.length;
    const requiredCount = requiredCorrect(totalCount, thresholdPct);
    return {
      correctCount,
      totalCount,
      requiredCount,
      passed: correctCount >= requiredCount,
      score: Math.round((correctCount / totalCount) * 100),
    };
  }

  private assertAnswerShape(
    answers: QuizAnswerSubmission[],
    expectedCount: number,
  ): void {
    if (answers.length !== expectedCount) {
      throw new InvalidQuizSubmissionError(
        `Expected exactly ${expectedCount} answers, received ${answers.length}`,
      );
    }
    const uniqueIds = new Set(answers.map((answer) => answer.questionId));
    if (uniqueIds.size !== answers.length) {
      throw new InvalidQuizSubmissionError('Duplicate questions in submission');
    }
  }

  private isAnswerCorrect(
    byId: Map<UUID, AcademyQuizQuestion>,
    answer: QuizAnswerSubmission,
  ): boolean {
    const question = byId.get(answer.questionId);
    if (!question) {
      throw new InvalidQuizSubmissionError(
        `Question ${answer.questionId} is not part of this chapter quiz`,
      );
    }
    const { selectedOptionIndex } = answer;
    if (
      selectedOptionIndex < 0 ||
      selectedOptionIndex >= question.options.length
    ) {
      throw new InvalidQuizSubmissionError(
        `Invalid option index for question ${answer.questionId}`,
      );
    }
    return question.options[selectedOptionIndex].isCorrect;
  }

  private async persistProgress(
    command: SubmitChapterQuizCommand,
    grade: Omit<QuizAttemptResult, 'academyCompleted'>,
  ): Promise<void> {
    const now = new Date();
    const existing = await this.progressRepository.findByUserAndChapter(
      command.userId,
      command.chapterId,
    );
    await this.progressRepository.upsert(
      new AcademyChapterProgress({
        id: existing?.id,
        userId: command.userId,
        chapterId: command.chapterId,
        // Keep a previous pass on a later failure — passing is not undone.
        passedAt: grade.passed ? now : (existing?.passedAt ?? null),
        lastScore: grade.score,
        lastAttemptAt: now,
        createdAt: existing?.createdAt,
      }),
    );
  }

  // Stamp/refresh the single whole-academy completion snapshot when every
  // currently quiz-enabled chapter has a passing progress row.
  private async recomputeCompletion(userId: UUID): Promise<boolean> {
    const quizEnabledIds = await this.chapterRepository.findQuizEnabledIds();
    const progress = await this.progressRepository.findAllByUser(userId);
    const passedIds = new Set(
      progress.filter((p) => p.passed).map((p) => p.chapterId),
    );
    const completed =
      quizEnabledIds.length > 0 &&
      quizEnabledIds.every((id) => passedIds.has(id));
    if (!completed) return false;
    const existing = await this.completionRepository.findByUser(userId);
    await this.completionRepository.upsert(
      new AcademyCompletion({
        id: existing?.id,
        userId,
        completedAt: new Date(),
        createdAt: existing?.createdAt,
      }),
    );
    return true;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import {
  ChapterNotFoundError,
  QuizNotAvailableError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { DRAWN_QUESTION_COUNT } from '../../quiz.constants';
import { GetChapterQuizQuery } from './get-chapter-quiz.query';

@Injectable()
export class GetChapterQuizUseCase {
  private readonly logger = new Logger(GetChapterQuizUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(query: GetChapterQuizQuery): Promise<AcademyQuizQuestion[]> {
    this.logger.log('Getting chapter quiz', { chapterId: query.chapterId });
    const chapter = await this.chapterRepository.findOne(query.chapterId);
    if (!chapter) {
      throw new ChapterNotFoundError(query.chapterId);
    }
    if (!chapter.quizEnabled) {
      throw new QuizNotAvailableError(query.chapterId);
    }
    const pool = await this.quizQuestionRepository.findAllByChapter(
      query.chapterId,
    );
    if (pool.length === 0) {
      throw new QuizNotAvailableError(query.chapterId);
    }
    return this.drawRandom(pool, DRAWN_QUESTION_COUNT);
  }

  // Fisher–Yates shuffle over a copy, returning the first `count` items (or the
  // whole pool when it holds fewer than `count`).
  private drawRandom(
    pool: AcademyQuizQuestion[],
    count: number,
  ): AcademyQuizQuestion[] {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Non-security shuffle: which quiz questions a learner is asked is not a
      // secret and correct answers are never sent to the client.
      // eslint-disable-next-line sonarjs/pseudo-random -- non-cryptographic quiz question selection
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}

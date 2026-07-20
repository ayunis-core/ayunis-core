import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertValidQuizOptions } from '../../quiz-question-validation';
import { CreateQuizQuestionCommand } from './create-quiz-question.command';

@Injectable()
export class CreateQuizQuestionUseCase {
  private readonly logger = new Logger(CreateQuizQuestionUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(
    command: CreateQuizQuestionCommand,
  ): Promise<AcademyQuizQuestion> {
    this.logger.log('Creating academy quiz question', {
      chapterId: command.chapterId,
    });
    try {
      assertValidQuizOptions(command.options);
      const chapter = await this.chapterRepository.findOne(command.chapterId);
      if (!chapter) {
        throw new ChapterNotFoundError(command.chapterId);
      }
      const maxPosition = await this.quizQuestionRepository.findMaxPosition(
        command.chapterId,
      );
      const quizQuestion = new AcademyQuizQuestion({
        chapterId: command.chapterId,
        text: command.text,
        options: command.options,
        position: (maxPosition ?? -1) + 1,
      });
      return await this.quizQuestionRepository.create(quizQuestion);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating academy quiz question', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}

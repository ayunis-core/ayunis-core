import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertValidQuizOptions } from '../../util/quiz-question-validation';
import { CreateQuizQuestionCommand } from './create-quiz-question.command';

@Injectable()
export class CreateQuizQuestionUseCase {
  constructor(
    @InjectPinoLogger(CreateQuizQuestionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(
    command: CreateQuizQuestionCommand,
  ): Promise<AcademyQuizQuestion> {
    this.logger.info(
      {
        chapterId: command.chapterId,
      },
      'Creating academy quiz question',
    );
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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating academy quiz question',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}

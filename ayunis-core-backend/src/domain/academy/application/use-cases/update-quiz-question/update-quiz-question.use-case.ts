import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  QuizQuestionNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertValidQuizOptions } from '../../util/quiz-question-validation';
import { UpdateQuizQuestionCommand } from './update-quiz-question.command';

@Injectable()
export class UpdateQuizQuestionUseCase {
  constructor(
    @InjectPinoLogger(UpdateQuizQuestionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(
    command: UpdateQuizQuestionCommand,
  ): Promise<AcademyQuizQuestion> {
    this.logger.info(
      {
        quizQuestionId: command.quizQuestionId,
      },
      'Updating academy quiz question',
    );
    try {
      assertValidQuizOptions(command.options);
      const existing = await this.quizQuestionRepository.findOne(
        command.quizQuestionId,
      );
      if (!existing) {
        throw new QuizQuestionNotFoundError(command.quizQuestionId);
      }
      const updated = new AcademyQuizQuestion({
        id: existing.id,
        chapterId: existing.chapterId,
        text: command.text,
        options: command.options,
        position: existing.position,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });
      return await this.quizQuestionRepository.update(updated);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error updating academy quiz question',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}

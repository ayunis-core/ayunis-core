import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyQuizQuestionRepository } from 'src/domain/academy/application/ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import {
  QuizQuestionNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { assertValidQuizOptions } from 'src/domain/academy/application/util/quiz-question-validation';
import { UpdateQuizQuestionCommand } from './update-quiz-question.command';

@Injectable()
export class UpdateQuizQuestionUseCase {
  private readonly logger = new Logger(UpdateQuizQuestionUseCase.name);

  constructor(
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(
    command: UpdateQuizQuestionCommand,
  ): Promise<AcademyQuizQuestion> {
    this.logger.log(
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

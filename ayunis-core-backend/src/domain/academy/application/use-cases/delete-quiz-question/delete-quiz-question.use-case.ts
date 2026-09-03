import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyQuizQuestionRepository } from 'src/domain/academy/application/ports/academy-quiz-question.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { DeleteQuizQuestionCommand } from './delete-quiz-question.command';

@Injectable()
export class DeleteQuizQuestionUseCase {
  private readonly logger = new Logger(DeleteQuizQuestionUseCase.name);

  constructor(
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(command: DeleteQuizQuestionCommand): Promise<void> {
    this.logger.log(
      {
        quizQuestionId: command.quizQuestionId,
      },
      'Deleting academy quiz question',
    );
    try {
      await this.quizQuestionRepository.delete(command.quizQuestionId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error deleting academy quiz question',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}

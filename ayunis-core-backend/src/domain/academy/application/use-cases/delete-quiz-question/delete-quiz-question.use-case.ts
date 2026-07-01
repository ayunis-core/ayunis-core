import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteQuizQuestionCommand } from './delete-quiz-question.command';

@Injectable()
export class DeleteQuizQuestionUseCase {
  private readonly logger = new Logger(DeleteQuizQuestionUseCase.name);

  constructor(
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(command: DeleteQuizQuestionCommand): Promise<void> {
    this.logger.log('Deleting academy quiz question', {
      quizQuestionId: command.quizQuestionId,
    });
    try {
      await this.quizQuestionRepository.delete(command.quizQuestionId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting academy quiz question', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}

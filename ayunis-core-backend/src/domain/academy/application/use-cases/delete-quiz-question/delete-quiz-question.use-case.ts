import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteQuizQuestionCommand } from './delete-quiz-question.command';

@Injectable()
export class DeleteQuizQuestionUseCase {
  constructor(
    @InjectPinoLogger(DeleteQuizQuestionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  async execute(command: DeleteQuizQuestionCommand): Promise<void> {
    this.logger.info(
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

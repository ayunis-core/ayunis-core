import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteQuizQuestionCommand } from './delete-quiz-question.command';

@Injectable()
export class DeleteQuizQuestionUseCase {
  private readonly logger = new Logger(DeleteQuizQuestionUseCase.name);

  constructor(
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: DeleteQuizQuestionCommand): Promise<void> {
    this.logger.log('Deleting academy quiz question', {
      quizQuestionId: command.quizQuestionId,
    });
    await this.quizQuestionRepository.delete(command.quizQuestionId);
  }
}

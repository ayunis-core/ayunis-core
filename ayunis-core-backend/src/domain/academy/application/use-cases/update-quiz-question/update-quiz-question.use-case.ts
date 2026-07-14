import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyQuizQuestionRepository } from '../../ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import {
  QuizQuestionNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertValidQuizOptions } from '../../quiz-question-validation';
import { UpdateQuizQuestionCommand } from './update-quiz-question.command';

@Injectable()
export class UpdateQuizQuestionUseCase {
  private readonly logger = new Logger(UpdateQuizQuestionUseCase.name);

  constructor(
    private readonly quizQuestionRepository: AcademyQuizQuestionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    command: UpdateQuizQuestionCommand,
  ): Promise<AcademyQuizQuestion> {
    this.logger.log('Updating academy quiz question', {
      quizQuestionId: command.quizQuestionId,
    });
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
    return this.quizQuestionRepository.update(updated);
  }
}

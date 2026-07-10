import type { UUID } from 'crypto';
import type { QuizAnswerOption } from '../../../domain/academy-quiz-question.entity';

export class UpdateQuizQuestionCommand {
  public readonly quizQuestionId: UUID;
  public readonly text: string;
  public readonly options: QuizAnswerOption[];

  constructor(params: {
    quizQuestionId: UUID;
    text: string;
    options: QuizAnswerOption[];
  }) {
    this.quizQuestionId = params.quizQuestionId;
    this.text = params.text;
    this.options = params.options;
  }
}

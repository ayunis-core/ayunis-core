import type { UUID } from 'crypto';
import type { QuizAnswerOption } from 'src/domain/academy/domain/academy-quiz-question.entity';

export class CreateQuizQuestionCommand {
  public readonly chapterId: UUID;
  public readonly text: string;
  public readonly options: QuizAnswerOption[];

  constructor(params: {
    chapterId: UUID;
    text: string;
    options: QuizAnswerOption[];
  }) {
    this.chapterId = params.chapterId;
    this.text = params.text;
    this.options = params.options;
  }
}

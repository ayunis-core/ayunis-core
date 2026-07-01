import type { UUID } from 'crypto';

export class DeleteQuizQuestionCommand {
  public readonly quizQuestionId: UUID;

  constructor(params: { quizQuestionId: UUID }) {
    this.quizQuestionId = params.quizQuestionId;
  }
}

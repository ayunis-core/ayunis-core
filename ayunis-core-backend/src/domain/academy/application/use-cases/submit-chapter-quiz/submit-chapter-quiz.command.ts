import type { UUID } from 'crypto';

export interface QuizAnswerSubmission {
  readonly questionId: UUID;
  readonly selectedOptionIndex: number;
}

export class SubmitChapterQuizCommand {
  public readonly userId: UUID;
  public readonly chapterId: UUID;
  public readonly answers: QuizAnswerSubmission[];

  constructor(params: {
    userId: UUID;
    chapterId: UUID;
    answers: QuizAnswerSubmission[];
  }) {
    this.userId = params.userId;
    this.chapterId = params.chapterId;
    this.answers = params.answers;
  }
}

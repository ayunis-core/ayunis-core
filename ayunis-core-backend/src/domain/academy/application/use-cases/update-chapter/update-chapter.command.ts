import type { UUID } from 'crypto';

export class UpdateChapterCommand {
  public readonly chapterId: UUID;
  public readonly title: string;
  public readonly description: string;
  public readonly quizEnabled?: boolean;
  public readonly passThreshold?: number;

  constructor(params: {
    chapterId: UUID;
    title: string;
    description: string;
    quizEnabled?: boolean;
    passThreshold?: number;
  }) {
    this.chapterId = params.chapterId;
    this.title = params.title;
    this.description = params.description;
    this.quizEnabled = params.quizEnabled;
    this.passThreshold = params.passThreshold;
  }
}

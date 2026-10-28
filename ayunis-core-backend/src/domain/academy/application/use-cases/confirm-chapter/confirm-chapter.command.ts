import type { UUID } from 'crypto';

export class ConfirmChapterCommand {
  public readonly userId: UUID;
  public readonly chapterId: UUID;

  constructor(params: { userId: UUID; chapterId: UUID }) {
    this.userId = params.userId;
    this.chapterId = params.chapterId;
  }
}

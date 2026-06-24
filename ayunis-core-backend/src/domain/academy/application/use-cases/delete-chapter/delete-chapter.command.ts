import type { UUID } from 'crypto';

export class DeleteChapterCommand {
  public readonly chapterId: UUID;

  constructor(params: { chapterId: UUID }) {
    this.chapterId = params.chapterId;
  }
}

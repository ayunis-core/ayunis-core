import type { UUID } from 'crypto';

export class GetChapterQuizQuery {
  public readonly chapterId: UUID;

  constructor(params: { chapterId: UUID }) {
    this.chapterId = params.chapterId;
  }
}

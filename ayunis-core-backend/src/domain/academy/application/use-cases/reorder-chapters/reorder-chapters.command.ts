import type { UUID } from 'crypto';

export class ReorderChaptersCommand {
  public readonly chapterIds: UUID[];

  constructor(params: { chapterIds: UUID[] }) {
    this.chapterIds = params.chapterIds;
  }
}

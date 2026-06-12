import type { UUID } from 'crypto';

export class ReorderLessonsCommand {
  public readonly chapterId: UUID;
  public readonly lessonIds: UUID[];

  constructor(params: { chapterId: UUID; lessonIds: UUID[] }) {
    this.chapterId = params.chapterId;
    this.lessonIds = params.lessonIds;
  }
}

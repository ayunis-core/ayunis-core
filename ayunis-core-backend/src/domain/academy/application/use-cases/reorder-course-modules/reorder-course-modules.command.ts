import type { UUID } from 'crypto';

export class ReorderCourseModulesCommand {
  public readonly chapterId: UUID;
  public readonly courseModuleIds: UUID[];

  constructor(params: { chapterId: UUID; courseModuleIds: UUID[] }) {
    this.chapterId = params.chapterId;
    this.courseModuleIds = params.courseModuleIds;
  }
}

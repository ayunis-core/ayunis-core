import type { UUID } from 'crypto';

export class DeleteCourseModuleCommand {
  public readonly courseModuleId: UUID;

  constructor(params: { courseModuleId: UUID }) {
    this.courseModuleId = params.courseModuleId;
  }
}

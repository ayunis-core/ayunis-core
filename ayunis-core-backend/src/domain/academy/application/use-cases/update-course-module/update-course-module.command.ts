import type { UUID } from 'crypto';

export class UpdateCourseModuleCommand {
  public readonly courseModuleId: UUID;
  public readonly title: string;
  public readonly description?: string | null;
  public readonly loomUrl: string;

  constructor(params: {
    courseModuleId: UUID;
    title: string;
    description?: string | null;
    loomUrl: string;
  }) {
    this.courseModuleId = params.courseModuleId;
    this.title = params.title;
    this.description = params.description;
    this.loomUrl = params.loomUrl;
  }
}

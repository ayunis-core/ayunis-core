import type { UUID } from 'crypto';

export class UpdateLessonCommand {
  public readonly lessonId: UUID;
  public readonly title: string;
  public readonly description?: string | null;
  public readonly loomUrl: string;

  constructor(params: {
    lessonId: UUID;
    title: string;
    description?: string | null;
    loomUrl: string;
  }) {
    this.lessonId = params.lessonId;
    this.title = params.title;
    this.description = params.description;
    this.loomUrl = params.loomUrl;
  }
}

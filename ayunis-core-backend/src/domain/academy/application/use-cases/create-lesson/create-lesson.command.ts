import type { UUID } from 'crypto';

export class CreateLessonCommand {
  public readonly chapterId: UUID;
  public readonly title: string;
  public readonly description?: string | null;
  public readonly loomUrl: string;

  constructor(params: {
    chapterId: UUID;
    title: string;
    description?: string | null;
    loomUrl: string;
  }) {
    this.chapterId = params.chapterId;
    this.title = params.title;
    this.description = params.description;
    this.loomUrl = params.loomUrl;
  }
}

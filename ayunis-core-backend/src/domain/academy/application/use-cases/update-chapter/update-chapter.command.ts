import type { UUID } from 'crypto';

export class UpdateChapterCommand {
  public readonly chapterId: UUID;
  public readonly title: string;
  public readonly description: string;

  constructor(params: { chapterId: UUID; title: string; description: string }) {
    this.chapterId = params.chapterId;
    this.title = params.title;
    this.description = params.description;
  }
}

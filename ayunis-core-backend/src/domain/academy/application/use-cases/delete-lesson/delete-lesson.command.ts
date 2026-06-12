import type { UUID } from 'crypto';

export class DeleteLessonCommand {
  public readonly lessonId: UUID;

  constructor(params: { lessonId: UUID }) {
    this.lessonId = params.lessonId;
  }
}

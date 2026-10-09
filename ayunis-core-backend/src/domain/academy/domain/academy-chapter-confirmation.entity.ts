import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class AcademyChapterConfirmation {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly chapterId: UUID;
  public readonly confirmedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    chapterId: UUID;
    confirmedAt: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.chapterId = params.chapterId;
    this.confirmedAt = params.confirmedAt;
  }
}

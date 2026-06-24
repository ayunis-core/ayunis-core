import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class AcademyLesson {
  public readonly id: UUID;
  public readonly chapterId: UUID;
  public readonly title: string;
  public readonly description: string | null;
  public readonly loomUrl: string;
  public readonly position: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    chapterId: UUID;
    title: string;
    description?: string | null;
    loomUrl: string;
    position: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.chapterId = params.chapterId;
    this.title = params.title;
    this.description = params.description ?? null;
    this.loomUrl = params.loomUrl;
    this.position = params.position;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

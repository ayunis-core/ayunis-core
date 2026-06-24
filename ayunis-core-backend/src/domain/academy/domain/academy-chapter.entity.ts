import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { AcademyLesson } from './academy-lesson.entity';

export class AcademyChapter {
  public readonly id: UUID;
  public readonly title: string;
  public readonly description: string;
  public readonly position: number;
  public readonly lessons: AcademyLesson[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    title: string;
    description: string;
    position: number;
    lessons?: AcademyLesson[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.title = params.title;
    this.description = params.description;
    this.position = params.position;
    this.lessons = params.lessons ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

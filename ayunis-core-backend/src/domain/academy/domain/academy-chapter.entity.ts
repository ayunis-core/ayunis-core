import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { AcademyCourseModule } from './academy-course-module.entity';

export class AcademyChapter {
  public readonly id: UUID;
  public readonly title: string;
  public readonly description: string;
  public readonly position: number;
  public readonly courseModules: AcademyCourseModule[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    title: string;
    description: string;
    position: number;
    courseModules?: AcademyCourseModule[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.title = params.title;
    this.description = params.description;
    this.position = params.position;
    this.courseModules = params.courseModules ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

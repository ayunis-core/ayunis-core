import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { AcademyCourseModule } from './academy-course-module.entity';
import type { AcademyQuizQuestion } from './academy-quiz-question.entity';

/**
 * Default percentage of correct answers required to pass a chapter quiz,
 * applied when a chapter does not override it.
 */
export const DEFAULT_PASS_THRESHOLD = 80;

export class AcademyChapter {
  public readonly id: UUID;
  public readonly title: string;
  public readonly description: string;
  public readonly position: number;
  public readonly quizEnabled: boolean;
  public readonly passThreshold: number;
  public readonly courseModules: AcademyCourseModule[];
  public readonly quizQuestions: AcademyQuizQuestion[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    title: string;
    description: string;
    position: number;
    quizEnabled?: boolean;
    passThreshold?: number;
    courseModules?: AcademyCourseModule[];
    quizQuestions?: AcademyQuizQuestion[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.title = params.title;
    this.description = params.description;
    this.position = params.position;
    this.quizEnabled = params.quizEnabled ?? false;
    this.passThreshold = params.passThreshold ?? DEFAULT_PASS_THRESHOLD;
    this.courseModules = params.courseModules ?? [];
    this.quizQuestions = params.quizQuestions ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

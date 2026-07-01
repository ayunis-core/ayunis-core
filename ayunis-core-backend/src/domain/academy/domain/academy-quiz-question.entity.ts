import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface QuizAnswerOption {
  readonly text: string;
  readonly isCorrect: boolean;
}

export class AcademyQuizQuestion {
  public readonly id: UUID;
  public readonly chapterId: UUID;
  public readonly text: string;
  public readonly options: QuizAnswerOption[];
  public readonly position: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    chapterId: UUID;
    text: string;
    options: QuizAnswerOption[];
    position: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.chapterId = params.chapterId;
    this.text = params.text;
    this.options = params.options;
    this.position = params.position;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

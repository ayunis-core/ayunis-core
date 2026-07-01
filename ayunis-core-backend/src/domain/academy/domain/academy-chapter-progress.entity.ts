import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * A learner's quiz progress for a single chapter. One row per (user, chapter),
 * upserted on every attempt. `passedAt` is the timestamp of the most recent
 * passing attempt (refreshed on re-pass); it is the durable working tracker the
 * whole-academy completion is derived from — it never drives access on its own.
 */
export class AcademyChapterProgress {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly chapterId: UUID;
  public readonly passedAt: Date | null;
  public readonly lastScore: number;
  public readonly lastAttemptAt: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    chapterId: UUID;
    passedAt?: Date | null;
    lastScore: number;
    lastAttemptAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.chapterId = params.chapterId;
    this.passedAt = params.passedAt ?? null;
    this.lastScore = params.lastScore;
    this.lastAttemptAt = params.lastAttemptAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get passed(): boolean {
    return this.passedAt !== null;
  }
}

import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * A learner's whole-academy completion snapshot. One row per user, stamped when
 * every configured chapter has a valid confirmation. `completedAt` is only
 * ever (re)written on full completion — it is never cleared or recomputed by
 * content changes, so adding a chapter never revokes an existing completion.
 */
export class AcademyCompletion {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly completedAt: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    completedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.completedAt = params.completedAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

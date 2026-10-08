import type { UUID } from 'crypto';

/**
 * A learner has recorded academy activity. `started` is the fact that this
 * user has begun; `participationConfirmedAt` is the current participation
 * confirmation snapshot, or null when they have not completed the academy.
 * Rates and "anyone in the org has started" are derived downstream.
 */
export class AcademyProgressUpdatedEvent {
  static readonly EVENT_NAME = 'academy.progress_updated';
  readonly started = true;

  constructor(
    public readonly userId: UUID,
    public readonly participationConfirmedAt: Date | null,
  ) {}
}

import type { UUID } from 'crypto';

/** Emitted once a routine's deletion is committed. */
export class RoutineDeletedEvent {
  static readonly EVENT_NAME = 'routine.deleted';

  constructor(
    public readonly routineId: UUID,
    public readonly userId: UUID,
  ) {}
}
